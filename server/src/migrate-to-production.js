/**
 * Migrate data from localhost database to production database
 * 
 * This script:
 * 1. Connects to localhost PostgreSQL database
 * 2. Exports all data from required tables
 * 3. Connects to production database
 * 4. Creates schema if needed
 * 5. Imports all data
 */

const path = require("node:path")
const { readFileSync } = require("node:fs")
require("dotenv").config({ path: path.join(__dirname, "..", ".env") })
const { Client } = require("pg")

const SCHEMA_PATH = path.join(__dirname, "schema.sql")

// Parse production database URL
const productionUrl = process.env.DATA_BASE || process.env.DATABASE_URL
if (!productionUrl) {
  console.error("❌ Production database URL not found in .env")
  console.error("   Set DATA_BASE or DATABASE_URL in server/.env")
  process.exit(1)
}

// Localhost config
const localhostConfig = {
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "root",
  database: process.env.PGDATABASE || "ML",
}

// Production config (parse from URL)
const productionConfig = {
  connectionString: productionUrl,
  ssl: {
    rejectUnauthorized: false, // Required for most hosted PostgreSQL
  },
}

async function exportData(client, table, columns) {
  console.log(`  📤 Exporting ${table}...`)
  const result = await client.query(`SELECT ${columns.join(", ")} FROM ${table}`)
  console.log(`     Found ${result.rows.length} rows`)
  return result.rows
}

async function importData(client, table, columns, rows, chunkSize = 100) {
  if (rows.length === 0) {
    console.log(`     No data to import`)
    return
  }

  console.log(`  📥 Importing ${rows.length} rows into ${table}...`)
  
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize)
    const values = []
    const params = []
    let index = 1
    
    for (const row of chunk) {
      const placeholders = columns.map(() => `$${index++}`).join(", ")
      values.push(`(${placeholders})`)
      params.push(...columns.map(col => row[col]))
    }
    
    await client.query(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${values.join(",")}
       ON CONFLICT DO NOTHING`,
      params
    )
  }
  
  console.log(`     ✓ Imported ${rows.length} rows`)
}

async function migrate() {
  console.log("\n🚀 Starting Migration from Localhost to Production\n")
  console.log("=" .repeat(60))
  
  // Connect to localhost
  console.log("\n1️⃣ Connecting to LOCALHOST database...")
  console.log(`   Host: ${localhostConfig.host}`)
  console.log(`   Database: ${localhostConfig.database}`)
  
  const localClient = new Client(localhostConfig)
  await localClient.connect()
  console.log("   ✓ Connected to localhost\n")
  
  // Connect to production
  console.log("2️⃣ Connecting to PRODUCTION database...")
  console.log(`   URL: ${productionUrl.replace(/:[^:@]+@/, ':****@')}`)
  
  const prodClient = new Client(productionConfig)
  await prodClient.connect()
  console.log("   ✓ Connected to production\n")
  
  try {
    // Create schema in production
    console.log("3️⃣ Setting up PRODUCTION schema...")
    await prodClient.query("BEGIN")
    
    const schema = readFileSync(SCHEMA_PATH, "utf8")
    await prodClient.query(schema)
    console.log("   ✓ Schema created/updated\n")
    
    // Export and import providers
    console.log("4️⃣ Migrating PROVIDERS table...")
    const providerColumns = [
      "id", "fraud_probability", "risk_score", "risk_tier",
      "total_claims", "unique_beneficiaries", "total_money_claimed",
      "average_claim_amount", "max_payout", "inpatient_claim_share",
      "average_visits_per_beneficiary", "any_claim_after_death",
      "first_claim_date", "last_claim_date",
      "primary_state_code", "primary_state_abbr", "primary_state_name",
      "reason_1", "reason_2", "reason_3"
    ]
    const providers = await exportData(localClient, "providers", providerColumns)
    await importData(prodClient, "providers", providerColumns, providers)
    console.log()
    
    // Export and import feature_importance
    console.log("5️⃣ Migrating FEATURE_IMPORTANCE table...")
    const importanceColumns = ["feature", "importance"]
    const importance = await exportData(localClient, "feature_importance", importanceColumns)
    await importData(prodClient, "feature_importance", importanceColumns, importance)
    console.log()
    
    // Export and import model_metrics
    console.log("6️⃣ Migrating MODEL_METRICS table...")
    const metricsColumns = [
      "id", "validation_roc_auc", "validation_average_precision",
      "training_rows_before_smote", "training_rows_after_smote",
      "validation_rows", "fraud_rate_in_validation"
    ]
    const metrics = await exportData(localClient, "model_metrics", metricsColumns)
    await importData(prodClient, "model_metrics", metricsColumns, metrics)
    console.log()
    
    // Export and import users
    console.log("7️⃣ Migrating USERS table...")
    const userColumns = ["id", "email", "password", "created_at"]
    try {
      const users = await exportData(localClient, "users", userColumns)
      await importData(prodClient, "users", userColumns, users)
    } catch (error) {
      console.log("     ⚠ Users table not found in localhost (skipping)")
    }
    console.log()
    
    // Commit transaction
    await prodClient.query("COMMIT")
    
    console.log("=" .repeat(60))
    console.log("\n✅ MIGRATION COMPLETE!\n")
    console.log("Summary:")
    console.log(`  • Providers: ${providers.length} records`)
    console.log(`  • Feature Importance: ${importance.length} records`)
    console.log(`  • Model Metrics: ${metrics.length} records`)
    console.log("\n🌐 Your production database is ready!")
    console.log("   Update your frontend to use the production API\n")
    
  } catch (error) {
    await prodClient.query("ROLLBACK")
    console.error("\n❌ Migration failed:", error.message)
    console.error("\nDetails:", error)
    process.exit(1)
  } finally {
    await localClient.end()
    await prodClient.end()
  }
}

// Run migration
console.log("\n⚠️  WARNING: This will overwrite data in production database")
console.log("   Make sure you have a backup if needed\n")

migrate().catch((error) => {
  console.error("❌ Fatal error:", error.message)
  process.exit(1)
})
