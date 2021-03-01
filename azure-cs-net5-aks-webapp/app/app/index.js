const express = require('express');
const morgan = require('morgan');

const app = express();
app.use(morgan('combined'));

app.get('/', (req, res) => {
    let place = "Kubernetes"; // this toy example assumes Kubernetes by default
    if (process.env.WEBSITE_HOSTNAME) {
        place = "Azure App Service";
    }
    res.send(`<html><body><h1>Your custom docker image is running in ${place}!</h1></body></html>`);
});

var listener = app.listen(process.env.PORT || 80, function() {
 console.log('listening on port ' + listener.address().port);
});