/**
 * Seed PostgreSQL from the pipeline CSV outputs.
 *
 * Required files (relative to the repo root):
 *   outputs/test_provider_risk_scores.csv
 *   outputs/test_provider_consolidated.csv
 *   outputs/high_risk_provider_explanations.csv
 *   outputs/model_feature_importance.csv
 *   outputs/model_validation_metrics.json
 *   outputs/test_master_claims_enriched.csv
 *
 * Commands:
 *   createdb -U postgres ML          (skip if the ML database already exists)
 *   cd server
 *   copy .env.example .env           (Windows)  or  cp .env.example .env
 *   npm install
 *   npm run seed
 */

const { createReadStream, existsSync, readFileSync } = require("node:fs")
const { readFile } = require("node:fs/promises")
const path = require("node:path")
const { createInterface } = require("node:readline")
const { Client } = require("pg")

const { parseCsv, parseCsvLine } = require("./csv")
const { adminConfig, dbConfig } = require("./db")
const { stateInfo } = require("./states")

const ROOT = path.resolve(__dirname, "..", "..")
const OUTPUT_DIR = process.env.SEED_DIR
  ? path.resolve(process.env.SEED_DIR)
  : path.join(ROOT, "outputs")
const SCHEMA_PATH = path.join(__dirname, "schema.sql")

const FILES = {
  scores: "test_provider_risk_scores.csv",
  consolidated: "test_provider_consolidated.csv",
  explanations: "high_risk_provider_explanations.csv",
  importance: "model_feature_importance.csv",
  metrics: "model_validation_metrics.json",
  claims: "test_master_claims_enriched.csv",
}

function numberValue(value) {
  if (value === undefined || value === null || value === "") return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function dateValue(value) {
  return value && String(value).trim() ? String(value).trim() : null
}

function requiredPath(name) {
  const filePath = path.join(OUTPUT_DIR, name)
  if (!existsSync(filePath)) {
    throw new Error(`Missing seed file: ${filePath}`)
  }
  return filePath
}

async function ensureDatabase() {
  const client = new Client(adminConfig())
  await client.connect()
  const { rows } = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbConfig.database]
  )
  if (rows.length === 0) {
    await client.query(`CREATE DATABASE "${dbConfig.database.replaceAll('"', "")}"`)
    console.log(`Created database ${dbConfig.database}`)
  } else {
    console.log(`Using existing database ${dbConfig.database}`)
  }
  await client.end()
}

async function loadPrimaryStates(claimsPath) {
  const counts = new Map()
  const stream = createReadStream(claimsPath, { encoding: "utf8" })
  const lines = createInterface({ input: stream, crlfDelay: Infinity })
  let providerIndex = -1
  let stateIndex = -1
  let header = true
  let scanned = 0

  for await (const line of lines) {
    const columns = parseCsvLine(line)
    if (header) {
      providerIndex = columns.indexOf("Provider")
      stateIndex = columns.indexOf("State")
      if (providerIndex < 0 || stateIndex < 0) {
        throw new Error("Claims CSV must include Provider and State columns")
      }
      header = false
      continue
    }
    const provider = columns[providerIndex]
    const state = columns[stateIndex]
    if (!provider || !state) continue
    let inner = counts.get(provider)
    if (!inner) {
      inner = new Map()
      counts.set(provider, inner)
    }
    inner.set(state, (inner.get(state) ?? 0) + 1)
    scanned += 1
  }

  const primary = new Map()
  for (const [provider, inner] of counts) {
    let bestState = "Unknown"
    let bestCount = -1
    for (const [state, count] of inner) {
      if (count > bestCount) {
        bestState = state
        bestCount = count
      }
    }
    primary.set(provider, bestState)
  }

  console.log(`Aggregated primary state from ${scanned.toLocaleString()} claims`)
  return primary
}

async function insertProviders(client, rows) {
  const chunkSize = 100
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize)
    const values = []
    const params = []
    let index = 1
    for (const row of chunk) {
      values.push(
        `($${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++})`
      )
      params.push(
        row.id,
        row.fraudProbability,
        row.riskScore,
        row.riskTier,
        row.totalClaims,
        row.uniqueBeneficiaries,
        row.totalMoneyClaimed,
        row.averageClaimAmount,
        row.maxPayout,
        row.inpatientClaimShare,
        row.averageVisitsPerBeneficiary,
        row.anyClaimAfterDeath,
        row.firstClaimDate,
        row.lastClaimDate,
        row.primaryStateCode,
        row.primaryStateAbbr,
        row.primaryStateName,
        row.reason1,
        row.reason2,
        row.reason3
      )
    }
    await client.query(
      `INSERT INTO providers (
        id, fraud_probability, risk_score, risk_tier, total_claims, unique_beneficiaries,
        total_money_claimed, average_claim_amount, max_payout, inpatient_claim_share,
        average_visits_per_beneficiary, any_claim_after_death, first_claim_date, last_claim_date,
        primary_state_code, primary_state_abbr, primary_state_name, reason_1, reason_2, reason_3
      ) VALUES ${values.join(",")}`,
      params
    )
  }
}

async function seed() {
  console.log(`Seed directory: ${OUTPUT_DIR}`)
  const paths = Object.fromEntries(
    Object.entries(FILES).map(([key, name]) => [key, requiredPath(name)])
  )

  await ensureDatabase()
  const client = new Client(dbConfig)
  await client.connect()

  try {
    await client.query("BEGIN")
    await client.query(readFileSync(SCHEMA_PATH, "utf8"))

    const [scores, consolidatedRows, explanationRows, importanceRows, metricsText, primaryStates] =
      await Promise.all([
        readFile(paths.scores, "utf8").then(parseCsv),
        readFile(paths.consolidated, "utf8").then(parseCsv),
        readFile(paths.explanations, "utf8").then(parseCsv),
        readFile(paths.importance, "utf8").then(parseCsv),
        readFile(paths.metrics, "utf8"),
        loadPrimaryStates(paths.claims),
      ])

    const consolidated = new Map(consolidatedRows.map((row) => [row.Provider, row]))
    const explanations = new Map(explanationRows.map((row) => [row.Provider, row]))

    const providers = scores.map((row) => {
      const profile = consolidated.get(row.Provider) ?? {}
      const explanation = explanations.get(row.Provider) ?? {}
      const state = stateInfo(primaryStates.get(row.Provider) ?? "Unknown")
      return {
        id: row.Provider,
        fraudProbability: numberValue(row.FraudProbability),
        riskScore: numberValue(row.ProviderRiskScore),
        riskTier: row.RiskTier || "Low Risk",
        totalClaims: Math.round(numberValue(profile.TotalClaims)),
        uniqueBeneficiaries: Math.round(numberValue(profile.UniqueBeneficiaries)),
        totalMoneyClaimed: numberValue(profile.TotalMoneyClaimed),
        averageClaimAmount: numberValue(profile.AverageClaimAmount),
        maxPayout: numberValue(profile.MaxPayout),
        inpatientClaimShare: numberValue(profile.InpatientClaimShare),
        averageVisitsPerBeneficiary: numberValue(profile.AverageVisitsPerBeneficiary),
        anyClaimAfterDeath: numberValue(profile.AnyClaimAfterDeath) > 0,
        firstClaimDate: dateValue(profile.FirstClaimDate),
        lastClaimDate: dateValue(profile.LastClaimDate),
        primaryStateCode: state.code,
        primaryStateAbbr: state.abbr,
        primaryStateName: `${state.abbr} · ${state.name}`,
        reason1: explanation.Reason1 || null,
        reason2: explanation.Reason2 || null,
        reason3: explanation.Reason3 || null,
      }
    })

    await insertProviders(client, providers)
    console.log(`Inserted ${providers.length.toLocaleString()} providers`)

    for (const row of importanceRows) {
      await client.query(
        "INSERT INTO feature_importance (feature, importance) VALUES ($1, $2)",
        [row.Feature, numberValue(row.Importance)]
      )
    }

    const metrics = JSON.parse(metricsText)
    await client.query(
      `INSERT INTO model_metrics (
        id, validation_roc_auc, validation_average_precision, training_rows_before_smote,
        training_rows_after_smote, validation_rows, fraud_rate_in_validation
      ) VALUES (1, $1, $2, $3, $4, $5, $6)`,
      [
        metrics.validation_roc_auc,
        metrics.validation_average_precision,
        metrics.training_rows_before_smote,
        metrics.training_rows_after_smote,
        metrics.validation_rows,
        metrics.fraud_rate_in_validation,
      ]
    )

    await client.query("COMMIT")
    console.log("Seed complete")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    await client.end()
  }
}

seed().catch((error) => {
  console.error("Seed failed:", error.message)
  process.exit(1)
})
