const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");

app.use(cors());
app.use(express.json());

app.get("/voting", async (request, response) => {
  console.log("Get all request");
  try {
    const allTodos = await pool.query("SELECT * FROM voting_app.choice ORDER BY choice_id");
    response.json(allTodos.rows);
  } catch (error) {
    console.error(error.message);
  }
});

app.post("/voting/:id", async (request, response) => {
  try {
    const { id } = request.params;
    console.log("Casting vote for " + id);
    await pool.query("UPDATE voting_app.choice SET vote_count = vote_count + 1 WHERE choice_id = $1", [
      id
    ]);
    response.json("Vote successfully cast");
  } catch (error) {
    console.log(error.message);
  }
});

app.listen(5000, async () => {
  console.log("server has started on port 5000");
});
