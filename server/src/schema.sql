DROP TABLE IF EXISTS providers CASCADE;
DROP TABLE IF EXISTS feature_importance CASCADE;
DROP TABLE IF EXISTS model_metrics CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  fraud_probability DOUBLE PRECISION NOT NULL DEFAULT 0,
  risk_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  risk_tier TEXT NOT NULL,
  total_claims INTEGER NOT NULL DEFAULT 0,
  unique_beneficiaries INTEGER NOT NULL DEFAULT 0,
  total_money_claimed DOUBLE PRECISION NOT NULL DEFAULT 0,
  average_claim_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  max_payout DOUBLE PRECISION NOT NULL DEFAULT 0,
  inpatient_claim_share DOUBLE PRECISION NOT NULL DEFAULT 0,
  average_visits_per_beneficiary DOUBLE PRECISION NOT NULL DEFAULT 0,
  any_claim_after_death BOOLEAN NOT NULL DEFAULT FALSE,
  first_claim_date DATE,
  last_claim_date DATE,
  primary_state_code TEXT NOT NULL DEFAULT 'Unknown',
  primary_state_abbr TEXT NOT NULL DEFAULT 'Unknown',
  primary_state_name TEXT NOT NULL DEFAULT 'Unknown',
  reason_1 TEXT,
  reason_2 TEXT,
  reason_3 TEXT
);

CREATE INDEX idx_providers_tier ON providers (risk_tier);
CREATE INDEX idx_providers_state ON providers (primary_state_abbr);
CREATE INDEX idx_providers_score ON providers (risk_score DESC);
CREATE INDEX idx_providers_last_claim ON providers (last_claim_date);

CREATE TABLE feature_importance (
  feature TEXT PRIMARY KEY,
  importance DOUBLE PRECISION NOT NULL
);

CREATE TABLE model_metrics (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  validation_roc_auc DOUBLE PRECISION NOT NULL,
  validation_average_precision DOUBLE PRECISION NOT NULL,
  training_rows_before_smote INTEGER NOT NULL,
  training_rows_after_smote INTEGER NOT NULL,
  validation_rows INTEGER NOT NULL,
  fraud_rate_in_validation DOUBLE PRECISION NOT NULL
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
