const mongoose = require("mongoose");

const url = "mongodb://" 
  + process.env["MONGODB_ADDRESS"] 
  + ":" + process.env["MONGODB_PORT"] 
  + "/" + process.env["DATABASE_NAME"]

mongoose.connect(url, { 
  useNewUrlParser: true,
  user: process.env["USER_NAME"],
  pass: process.env["USER_PASSWORD"]
});

const connection = mongoose.connection;
module.exports = connection;
