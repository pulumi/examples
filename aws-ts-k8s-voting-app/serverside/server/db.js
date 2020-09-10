const Pool = require("pg").Pool;

const pool = new Pool({
  user: process.env["USER_NAME"],
  password: process.env["USER_PASSWORD"],
  host: process.env["POSTGRES_ADDRESS"],
  port: process.env["POSTGRES_PORT"],
  database: process.env["DATABASE_NAME"],
  ssl: false,
});

module.exports = pool;
