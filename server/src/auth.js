const { pool } = require("./db")

async function register(email, password) {
  // Basic validation
  if (!email || !password) {
    throw new Error("Email and password are required")
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters")
  }

  // Check if user already exists
  const existingUser = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [email.toLowerCase()]
  )

  if (existingUser.rows.length > 0) {
    throw new Error("Email already registered")
  }

  // Insert new user (in production, hash the password!)
  const result = await pool.query(
    "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at",
    [email.toLowerCase(), password]
  )

  return result.rows[0]
}

async function login(email, password) {
  // Basic validation
  if (!email || !password) {
    throw new Error("Email and password are required")
  }

  // Find user
  const result = await pool.query(
    "SELECT id, email, password, created_at FROM users WHERE email = $1",
    [email.toLowerCase()]
  )

  if (result.rows.length === 0) {
    throw new Error("Invalid email or password")
  }

  const user = result.rows[0]

  // Check password (in production, use bcrypt compare!)
  if (user.password !== password) {
    throw new Error("Invalid email or password")
  }

  // Return user without password
  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
  }
}

module.exports = { register, login }
