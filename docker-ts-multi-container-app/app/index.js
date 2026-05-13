const express = require("express");
const redis = require("redis");

const app = express();
const redisPort = process.env.REDIS_PORT;
const redisHost = process.env.REDIS_HOST;
const redisClient = redis.createClient(redisPort, redisHost);
const redisKey = "hits";

app.get("/", (req, res) => {
    redisClient.get(redisKey, async (err, redisData) => {
        if (err) {
            throw err;
        }

        if(redisData) {
            console.log(redisData);
            const jsonData = JSON.parse(redisData);
            const currentVisits = jsonData.num;
            const data = {num: currentVisits + 1};
            redisClient.set(redisKey, JSON.stringify(data));
            res.send(`I have been viewed ${currentVisits} times.`);
        } else {
            const data = {num: 1};
            redisClient.set(redisKey, JSON.stringify(data));
            res.send(`I have been viewed ${data.num} time.`);
        }
    });
});

app.listen(3000, () => {
    console.log("Node server started");
    console.log(`Redis Host: ${redisHost}`);
    console.log(`Redis Port: ${redisPort}`);
});
