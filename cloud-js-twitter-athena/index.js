const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const cloud = require("@pulumi/cloud-aws");

const bucket = new cloud.Bucket("tweet-bucket");

let config = new pulumi.Config();
let consumerKey = config.require("twitterConsumerKey");
let consumerSecret = config.require("twitterConsumerSecret");
let accessTokenKey = config.require("twitterAccessTokenKey");
let accessTokenSecret = config.require("twitterAccessTokenSecret");

let twitterQuery = config.require("twitterQuery");
const outputFolder = "tweets";

cloud.timer.interval("twitter-search-timer", { minutes: 2 }, async() => {
    var twitterClient = require('twitter');

    var client = new twitterClient({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
        access_token_key: accessTokenKey,
        access_token_secret: accessTokenSecret,
    });

    client.get('search/tweets', {q: twitterQuery, count: 100}, function(error, tweets, response) {
        let statuses = tweets.statuses;

        let results = statuses.map(s => {
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

        console.log(`Got ${results.length} tweets from Twitter for query ${twitterQuery}`);

        let filename = `${outputFolder}/${Date.now()}`;
        let contents = Buffer.from(results.join("\n"), "utf8");

        bucket.put(filename, contents);
    });
});

// athena setup
let athena = new aws.athena.Database("tweets_database_2",
    { name: "tweets_database_2", bucket: bucket.bucket.id, forceDestroy: true }
);

// Sadly, there isn't support for Athena tables in Terraform.
// See https://github.com/terraform-providers/terraform-provider-aws/pull/1893#issuecomment-351300973
// So, we'll instead create a query for the table definition
function createTableQuery(bucket) {
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

let bucketName = bucket.bucket.id;

let createTableAthenaQuery = new aws.athena.NamedQuery(
    "createTable", { database: athena.id, query: bucketName.apply(createTableQuery)});

let topUsersAthenaQuery = new aws.athena.NamedQuery("topUsers", { database: athena.id, query: topUsersQuery});

function getQueryUri(queryId) {
    let config = new pulumi.Config("aws");
    let region = config.require("region");
    return `https://${region}.console.aws.amazon.com/athena/home?force#query/saved/${queryId}`;
}

exports.bucketName = bucketName
exports.athenaDatabase = athena.id;
exports.topUsersQueryUri = topUsersAthenaQuery.id.apply(getQueryUri);
exports.createTableQueryUri = createTableAthenaQuery.id.apply(getQueryUri);
