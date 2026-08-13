const Pool = require("pg").Pool;

const pool = new Pool({
  user: process.env["USER_NAME"],
  password: process.env["USER_PASSWORD"],
  host: process.env["RDS_ADDRESS"],
  port: process.env["RDS_PORT"],
  database: process.env["DATABASE_NAME"],
  // RDS PostgreSQL requires TLS. This example does not verify the RDS certificate
  // authority; a production app should supply the RDS CA bundle instead.
  ssl: { rejectUnauthorized: false },
});

module.exports = pool;
