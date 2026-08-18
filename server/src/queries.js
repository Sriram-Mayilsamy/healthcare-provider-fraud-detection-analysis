const { pool } = require("./db")

function number(value) {
  return value === null || value === undefined ? 0 : Number(value)
}

function isoDate(value) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).slice(0, 10)
}

function mapProvider(row) {
  return {
    id: row.id,
    score: number(row.risk_score),
    probability: number(row.fraud_probability),
    tier: row.risk_tier,
    totalMoneyClaimed: number(row.total_money_claimed),
    totalClaims: number(row.total_claims),
    uniqueBeneficiaries: number(row.unique_beneficiaries),
    averageVisitsPerBeneficiary: number(row.average_visits_per_beneficiary),
    averageClaimAmount: number(row.average_claim_amount),
    maxPayout: number(row.max_payout),
    inpatientClaimShare: number(row.inpatient_claim_share),
    anyClaimAfterDeath: Boolean(row.any_claim_after_death),
    primaryState: row.primary_state_abbr,
    primaryStateName: row.primary_state_name,
    firstClaimDate: isoDate(row.first_claim_date),
    lastClaimDate: isoDate(row.last_claim_date),
    reasons: [row.reason_1, row.reason_2, row.reason_3].filter(
      (reason) => typeof reason === "string" && reason.trim()
    ),
  }
}

function mapListRow(row) {
  const provider = mapProvider(row)
  return {
    id: provider.id,
    score: provider.score,
    tier: provider.tier,
    totalMoneyClaimed: provider.totalMoneyClaimed,
    uniqueBeneficiaries: provider.uniqueBeneficiaries,
    primaryState: provider.primaryState,
    primaryStateName: provider.primaryStateName,
    lastClaimDate: provider.lastClaimDate,
  }
}

function filterClause(query) {
  const where = []
  const params = []
  let index = 1

  if (query.tier && query.tier !== "all") {
    where.push(`risk_tier = $${index++}`)
    params.push(query.tier)
  }
  if (query.state && query.state !== "all") {
    where.push(`primary_state_abbr = $${index++}`)
    params.push(query.state)
  }
  if (query.from) {
    where.push(`(last_claim_date IS NULL OR last_claim_date >= $${index++})`)
    params.push(query.from)
  }
  if (query.to) {
    where.push(`(last_claim_date IS NULL OR last_claim_date <= $${index++})`)
    params.push(query.to)
  }
  if (query.q) {
    where.push(
      `(id ILIKE $${index} OR primary_state_abbr ILIKE $${index} OR primary_state_name ILIKE $${index} OR risk_tier ILIKE $${index})`
    )
    params.push(`%${query.q}%`)
    index += 1
  }

  return {
    sql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
    index,
  }
}

async function getMeta() {
  const [bounds, states, metrics, importance] = await Promise.all([
    pool.query(
      `SELECT MIN(last_claim_date) AS min_date, MAX(last_claim_date) AS max_date
       FROM providers`
    ),
    pool.query(
      `SELECT DISTINCT primary_state_abbr AS state
       FROM providers
       ORDER BY primary_state_abbr`
    ),
    pool.query("SELECT * FROM model_metrics WHERE id = 1"),
    pool.query(
      `SELECT feature, importance
       FROM feature_importance
       ORDER BY importance DESC
       LIMIT 10`
    ),
  ])

  const metric = metrics.rows[0]
  return {
    minClaimDate: isoDate(bounds.rows[0]?.min_date),
    maxClaimDate: isoDate(bounds.rows[0]?.max_date),
    states: states.rows.map((row) => row.state),
    metrics: metric
      ? {
          validationRocAuc: number(metric.validation_roc_auc),
          validationAveragePrecision: number(metric.validation_average_precision),
          trainingRowsBeforeSmote: number(metric.training_rows_before_smote),
          trainingRowsAfterSmote: number(metric.training_rows_after_smote),
          validationRows: number(metric.validation_rows),
          fraudRateInValidation: number(metric.fraud_rate_in_validation),
        }
      : null,
    featureImportance: importance.rows.map((row) => ({
      feature: row.feature,
      importance: number(row.importance),
    })),
  }
}

async function getAnalytics(query) {
  const filter = filterClause(query)
  const geoFilter = filterClause({ ...query, tier: "all" })
  const [kpis, geo, mix, queue, meta] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)::int AS scanned,
         COUNT(*) FILTER (WHERE risk_tier = 'High Risk')::int AS high_risk,
         COALESCE(SUM(total_money_claimed) FILTER (WHERE risk_tier = 'High Risk'), 0) AS exposure
       FROM providers
       ${filter.sql}`,
      filter.params
    ),
    pool.query(
      `SELECT primary_state_abbr AS state, COUNT(*)::int AS providers
       FROM providers
       ${geoFilter.sql ? `${geoFilter.sql} AND` : "WHERE"} risk_tier = 'High Risk'
       GROUP BY primary_state_abbr
       ORDER BY providers DESC
       LIMIT 18`,
      geoFilter.params
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE risk_tier = 'Low Risk')::int AS low,
         COUNT(*) FILTER (WHERE risk_tier = 'Medium Risk')::int AS medium,
         COUNT(*) FILTER (WHERE risk_tier = 'High Risk')::int AS high
       FROM providers
       ${filter.sql}`,
      filter.params
    ),
    pool.query(
      `SELECT *
       FROM providers
       ${
         query.tier && query.tier !== "all"
           ? filter.sql
           : `${filter.sql ? `${filter.sql} AND` : "WHERE"} risk_tier = 'High Risk'`
       }
       ORDER BY risk_score DESC
       LIMIT 15`,
      filter.params
    ),
    getMeta(),
  ])

  const scanned = kpis.rows[0].scanned
  const highRisk = kpis.rows[0].high_risk
  return {
    kpis: {
      scanned,
      highRisk,
      exposure: number(kpis.rows[0].exposure),
      highShare: scanned ? highRisk / scanned : 0,
    },
    geo: geo.rows.map((row) => ({
      state: row.state,
      providers: number(row.providers),
    })),
    mix: [
      { tier: "Low", count: mix.rows[0].low },
      { tier: "Medium", count: mix.rows[0].medium },
      { tier: "High", count: mix.rows[0].high },
    ],
    queue: queue.rows.map(mapListRow),
    featureImportance: meta.featureImportance,
    metrics: meta.metrics,
    minClaimDate: meta.minClaimDate,
    maxClaimDate: meta.maxClaimDate,
    states: meta.states,
  }
}

async function listProviders(query) {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 12))
  const filter = filterClause(query)
  const offset = (page - 1) * pageSize
  const countIndex = filter.index
  const [count, rows] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM providers ${filter.sql}`, filter.params),
    pool.query(
      `SELECT * FROM providers ${filter.sql}
       ORDER BY risk_score DESC
       LIMIT $${countIndex} OFFSET $${countIndex + 1}`,
      [...filter.params, pageSize, offset]
    ),
  ])
  return {
    rows: rows.rows.map(mapListRow),
    total: count.rows[0].total,
    page,
    pageSize,
  }
}

async function exportProviders(query) {
  const filter = filterClause(query)
  const ids = query.ids
    ? String(query.ids)
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    : []
  let sql = `SELECT * FROM providers ${filter.sql}`
  const params = [...filter.params]
  if (ids.length) {
    sql += `${filter.sql ? " AND" : "WHERE"} id = ANY($${filter.index})`
    params.push(ids)
  }
  sql += " ORDER BY risk_score DESC"
  const result = await pool.query(sql, params)
  return result.rows.map(mapListRow)
}

async function searchProviders(q, limit = 20) {
  const result = await pool.query(
    `SELECT id, risk_score, risk_tier, primary_state_name
     FROM providers
     WHERE $1 = '' OR id ILIKE $2 OR primary_state_abbr ILIKE $2 OR risk_tier ILIKE $2
     ORDER BY CASE WHEN $1 = '' THEN id END ASC, risk_score DESC
     LIMIT $3`,
    [q || "", `%${q || ""}%`, Math.min(50, Number(limit) || 20)]
  )
  return result.rows.map((row) => ({
    id: row.id,
    score: number(row.risk_score),
    tier: row.risk_tier,
    primaryStateName: row.primary_state_name,
  }))
}

async function getProvider(id) {
  const result = await pool.query("SELECT * FROM providers WHERE id = $1", [id])
  return result.rows[0] ? mapProvider(result.rows[0]) : null
}

module.exports = {
  getMeta,
  getAnalytics,
  listProviders,
  exportProviders,
  searchProviders,
  getProvider,
}
