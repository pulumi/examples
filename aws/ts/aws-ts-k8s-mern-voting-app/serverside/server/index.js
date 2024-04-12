const express = require("express");
const app = express();
const cors = require("cors");
const connection = require("./db");

app.use(cors());
app.use(express.json());

connection.once("open", function() {
  console.log("Connection opened to database!");
})

let Choice = require("./model");

app.get("/voting", async (request, response) => {
  console.log("Get all request");
  Choice.find(function(error, result) {
    if (error) {
        console.log(error);
    } else {      
      response.json(result);
    }
  });
});

app.post("/voting/:id", async (request, response) => {
  const { id } = request.params;
  console.log("Casting vote for: " + id);
  
  Choice.findById(id, function(error, result) {
    if (!result) {
      response.status(404).send("Choice not found");
    } else {
      result.vote_count = result.vote_count + 1;
      result.save().then(result => {
        response.json("Vote successfully cast");
      }).catch(error => {
        response.status(400).send("Failed to cast vote");
      });
    }
  });
});

app.listen(5000, async () => {
  console.log("server has started on port 5000");
});
