const https = require('https');

exports.handler = async (event) => {
    // Get the Slack webhook URL from environment variables
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

    // Define the message payload
    const slackMessage = JSON.stringify({
        text: event.body
    });

    // Slack Webhook URL parsed
    const url = new URL(slackWebhookUrl);

    const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': slackMessage.length
        }
    };

    // Create a promise to post the message
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let response = '';

            res.on('data', (chunk) => {
                response += chunk;
            });

            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: response
                });
            });
        });

        req.on('error', (error) => {
            reject({
                statusCode: 500,
                body: JSON.stringify(error)
            });
        });

        // Send the Slack message
        req.write(slackMessage);
        req.end();
    });
};
