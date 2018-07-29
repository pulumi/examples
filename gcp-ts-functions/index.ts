import * as gcpFunction from "./gcpFunction";

let greetingFunction = new gcpFunction.HttpFunction("greeting", (req, res) => {
    res.send(`Greetings from ${req.body.name || 'Google Cloud Functions'}!`);
});

export let url = greetingFunction.httpsTriggerUrl;
