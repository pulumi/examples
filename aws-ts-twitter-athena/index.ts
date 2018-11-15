import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const bucket = new aws.s3.Bucket("tweet-bucket", {
    serverSideEncryptionConfiguration: {
        rule: {
            applyServerSideEncryptionByDefault: {
                sseAlgorithm: "AES256",
            },
        },
    },
});
let bucketName = bucket.id;

let config = new pulumi.Config();
let consumerKey = config.require("twitterConsumerKey");
let consumerSecret = config.require("twitterConsumerSecret");
let accessTokenKey = config.require("twitterAccessTokenKey");
let accessTokenSecret = config.require("twitterAccessTokenSecret");

let twitterQuery = config.require("twitterQuery");
const outputFolder = "tweets";

let eventRule = new aws.cloudwatch.EventRule("twitter-search-timer", {
    scheduleExpression: "rate(1 minute)"
});

let handler = eventRule.onEvent("on-timer-event", async() => {
    console.log("Timer fired.");
    let twitterClient = require("twitter");
    var client = new twitterClient({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
        access_token_key: accessTokenKey,
        access_token_secret: accessTokenSecret,
    });
    
    const tweets = await new Promise<string[]>((resolve, reject) => {
        client.get('search/tweets', {q: twitterQuery, count: 100}, function(error: any, tweets: any, response: any) {
            if (error) {
                return reject(error);
            }

            let statuses = tweets.statuses;
            console.log(`Got ${statuses.length} statuses.`);
    
            let results = statuses.map((s: any) => {
                let user = s.user.screen_name;
        
                return JSON.stringify({ 
                    created_at: s.created_at,
                    id: s.id_str, 
                    text: s.text, 
                    user: user,
                    hashtags: s.entities.hashtags,
                    followers: s.user.followers_count, 
                    isVerified: s.user.verified,
                    isRetweet: s.retweeted_status != null,
                    url: `https://twitter.com/${user}/status/${s.id_str}`,
                });
            });

            return resolve(results);
        });
    });

    console.log(`Got ${tweets.length} tweets from Twitter for query ${twitterQuery}`);
    
    let filename = `${outputFolder}/${Date.now()}`;
    let contents = Buffer.from(tweets.join("\n"), "utf8");

    let s3 = new aws.sdk.S3();
    await s3.putObject({
        Bucket: bucket.id.get(),
        Key: filename,
        Body: contents,
    }).promise();
});

// athena setup
let athena = new aws.athena.Database("tweets_database", 
    { name: "tweets_database", bucket: bucket.id, forceDestroy: true } 
);

// Sadly, there isn't support for Athena tables in Terraform. 
// See https://github.com/terraform-providers/terraform-provider-aws/pull/1893#issuecomment-351300973
// So, we'll instead create a query for the table definition
function createTableQuery(bucket: string) {
    return `CREATE EXTERNAL TABLE IF NOT EXISTS tweets (
        id string,
        text string,
        user string,
        isVerified boolean,
        url string,
        followers int,
        hashtags string,
        isRetweet boolean
    )
    ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
    LOCATION 's3://${bucket}/${outputFolder}/';`;
}

let topUsersQuery = 
    `select distinct user, followers, text, url 
    from tweets 
    where isRetweet = false and followers > 1000
    order by followers desc`;

let createTableAthenaQuery = new aws.athena.NamedQuery(
    "createTable", { database: athena.id, query: bucketName.apply(createTableQuery)});

let topUsersAthenaQuery = new aws.athena.NamedQuery("topUsers", { database: athena.id, query: topUsersQuery});

function getQueryUri(queryId: string) {
    let config = new pulumi.Config("aws");
    let region = config.require("region");
    return `https://${region}.console.aws.amazon.com/athena/home?force#query/saved/${queryId}`;
}

exports.bucketName = bucketName
exports.athenaDatabase = athena.id;
exports.topUsersQueryUri = topUsersAthenaQuery.id.apply(getQueryUri);
exports.createTableQueryUri = createTableAthenaQuery.id.apply(getQueryUri); 
