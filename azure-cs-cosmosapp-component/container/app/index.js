const express = require('express');
const morgan = require('morgan');
const cosmos = require('@azure/cosmos');

const app = express();
app.use(morgan('combined'));


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
});

app.get('/cosmos', async (req, res) => {
  const endpoint = process.env.ENDPOINT;
  const key = process.env.MASTER_KEY;
  const database = process.env.DATABASE;
  const collection = process.env.COLLECTION;
  const location = process.env.LOCATION;

  const client = new cosmos.CosmosClient({ endpoint, key, connectionPolicy: { preferredLocations: [location] } });
  const container = client.database(database).container(collection);
  const response = await container.item("test", undefined).read();

  if (response.resource && response.resource.url) {
    res.send(response.resource.url);
  } else {
    res.status(404).end();
  }
});

app.get('/api/ping', (req, res) => {
  res.send('Ack')
});

var listener = app.listen(process.env.PORT || 80, function() {
 console.log('listening on port ' + listener.address().port);
});