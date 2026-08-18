const path = require("node:path")
require("dotenv").config({ path: path.join(__dirname, "..", ".env") })

const cors = require("cors")
const express = require("express")

const {
  exportProviders,
  getAnalytics,
  getMeta,
  getProvider,
  listProviders,
  searchProviders,
} = require("./queries")

const { register, login } = require("./auth")

// Python ML API proxy
const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000"

const app = express()
const port = Number(process.env.PORT || 4000)

app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  })
)
app.use(express.json())

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next)
  }
}

app.get("/health", (_req, res) => {
  res.json({ ok: true })
})

// Authentication routes
app.post(
  "/api/auth/register",
  asyncRoute(async (req, res) => {
    const { email, password } = req.body
    try {
      const user = await register(email, password)
      res.status(201).json({ success: true, user })
    } catch (error) {
      res.status(400).json({ success: false, error: error.message })
    }
  })
)

app.post(
  "/api/auth/login",
  asyncRoute(async (req, res) => {
    const { email, password } = req.body
    try {
      const user = await login(email, password)
      res.json({ success: true, user })
    } catch (error) {
      res.status(401).json({ success: false, error: error.message })
    }
  })
)

app.get(
  "/api/meta",
  asyncRoute(async (_req, res) => {
    res.json(await getMeta())
  })
)

app.get(
  "/api/analytics",
  asyncRoute(async (req, res) => {
    res.json(await getAnalytics(req.query))
  })
)

app.get(
  "/api/providers/search",
  asyncRoute(async (req, res) => {
    res.json(await searchProviders(String(req.query.q || ""), req.query.limit))
  })
)

app.get(
  "/api/providers/export",
  asyncRoute(async (req, res) => {
    res.json(await exportProviders(req.query))
  })
)

app.get(
  "/api/providers/:id",
  asyncRoute(async (req, res) => {
    const provider = await getProvider(req.params.id)
    if (!provider) {
      res.status(404).json({ error: "Provider not found" })
      return
    }
    res.json(provider)
  })
)

app.get(
  "/api/providers",
  asyncRoute(async (req, res) => {
    res.json(await listProviders(req.query))
  })
)

// ML Prediction endpoints - proxy to Python API
app.get(
  "/api/predict/features",
  asyncRoute(async (_req, res) => {
    const response = await fetch(`${PYTHON_API_URL}/predict/features`)
    if (!response.ok) {
      throw new Error(`Python API error: ${response.statusText}`)
    }
    res.json(await response.json())
  })
)

app.post(
  "/api/predict",
  asyncRoute(async (req, res) => {
    const response = await fetch(`${PYTHON_API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    })
    if (!response.ok) {
      const error = await response.json()
      res.status(response.status).json(error)
      return
    }
    res.json(await response.json())
  })
)

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: error.message || "Server error" })
})

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
