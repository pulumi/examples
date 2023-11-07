// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as s3sdk from "@aws-sdk/client-s3";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const bucket = new aws.s3.Bucket("tweet-bucket", {
    serverSideEncryptionConfiguration: {
        rule: {
            applyServerSideEncryptionByDefault: {
                sseAlgorithm: "AES256",
            },
        },
    },
    forceDestroy: true, // We require this in the example as we are not managing the contents of the bucket via Pulumi
});
export const bucketName = bucket.id;

const config = new pulumi.Config();
const consumerKey = config.require("twitterConsumerKey");
const consumerSecret = config.require("twitterConsumerSecret");
const accessTokenKey = config.require("twitterAccessTokenKey");
const accessTokenSecret = config.require("twitterAccessTokenSecret");

const twitterQuery = config.require("twitterQuery");
const outputFolder = "tweets";

const eventRule = new aws.cloudwatch.EventRule("twitter-search-timer", {
    scheduleExpression: "rate(1 minute)",
});

const handler = eventRule.onEvent("on-timer-event", async() => {
    console.log("Timer fired.");
    const twitterClient = require("twitter");
    const client = new twitterClient({
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
        access_token_key: accessTokenKey,
        access_token_secret: accessTokenSecret,
    });

    const tweets = await new Promise<string[]>((resolve, reject) => {
        client.get("search/tweets", {q: twitterQuery, count: 100}, function(error: any, tweets: any, response: any) {
            if (error) {
                return reject(error);
            }

            const statuses = tweets.statuses;
            console.log(`Got ${statuses.length} statuses.`);

            const results = statuses.map((s: any) => {
                const user = s.user.screen_name;

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

    const filename = `${outputFolder}/${Date.now()}`;
    const contents = Buffer.from(tweets.join("\n"), "utf8");

    const s3 = new s3sdk.S3({});
    await s3.putObject({
        Bucket: bucket.id.get(),
        Key: filename,
        Body: contents,
    });
});

// athena setup
const athena = new aws.athena.Database("tweets_database_1",
    { bucket: bucket.id, forceDestroy: true },
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

const topUsersQuery =
    `select distinct user, followers, text, url
    from tweets
    where isRetweet = false and followers > 1000
    order by followers desc`;

const createTableAthenaQuery = new aws.athena.NamedQuery(
    "createTable", { database: athena.id, query: bucketName.apply(createTableQuery)});

const topUsersAthenaQuery = new aws.athena.NamedQuery("topUsers", { database: athena.id, query: topUsersQuery});

function getQueryUri(queryId: string) {
    const config = new pulumi.Config("aws");
    const region = config.require("region");
    return `https://${region}.console.aws.amazon.com/athena/home?force#query/saved/${queryId}`;
}

export const athenaDatabase = athena.id;
export const topUsersQueryUri = topUsersAthenaQuery.id.apply(getQueryUri);
export const createTableQueryUri = createTableAthenaQuery.id.apply(getQueryUri);
