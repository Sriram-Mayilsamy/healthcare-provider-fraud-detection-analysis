const path = require("node:path")
require("dotenv").config({ path: path.join(__dirname, "..", ".env") })
const { Pool } = require("pg")

// Check for DATABASE_URL (production) or individual config (local)
const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Required for hosted PostgreSQL
      },
    }
  : {
      host: process.env.PGHOST || "localhost",
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD || "root",
      database: process.env.PGDATABASE || "ML",
    }

const pool = new Pool(dbConfig)

function adminConfig() {
  if (process.env.DATABASE_URL) {
    // For production, use the same connection
    return dbConfig
  }
  // For local, connect to postgres database
  return {
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "root",
    database: "postgres",
  }
}

module.exports = { pool, dbConfig, adminConfig }
