const mongoose = require("mongoose");

let Choice = new mongoose.Schema({
    _id: Number,
    text: {
        type: String
    },
    vote_count: {
        type: Number
    },
});

module.exports = mongoose.model("choice", Choice);
