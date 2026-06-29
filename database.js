const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  // Add this SSL block for cloud databases
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;

// Test the connection immediately
pool
  .getConnection()
  .then((connection) => {
    console.log("✅ Successfully connected to the FarmRentals MySQL Database!");
    connection.release();
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err.message);
  });

module.exports = pool;
