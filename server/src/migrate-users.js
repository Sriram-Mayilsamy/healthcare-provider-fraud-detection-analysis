const path = require("node:path")
require("dotenv").config({ path: path.join(__dirname, "..", ".env") })
const { pool } = require("./db")

async function migrateUsers() {
  try {
    console.log("Creating users table...")
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `)
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
    `)
    
    console.log("✓ Users table created successfully")
    
    // Optional: Create a demo user
    const demoEmail = "demo@example.com"
    const demoPassword = "demo123"
    
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [demoEmail]
    )
    
    if (existingUser.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (email, password) VALUES ($1, $2)",
        [demoEmail, demoPassword]
      )
      console.log(`✓ Demo user created: ${demoEmail} / ${demoPassword}`)
    } else {
      console.log("✓ Demo user already exists")
    }
    
    process.exit(0)
  } catch (error) {
    console.error("Migration failed:", error)
    process.exit(1)
  }
}

migrateUsers()
