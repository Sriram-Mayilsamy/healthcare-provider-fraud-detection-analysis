export type RiskTier = "High Risk" | "Medium Risk" | "Low Risk"

export type ProviderRow = {
  id: string
  score: number
  probability: number
  tier: RiskTier
  totalMoneyClaimed: number
  totalClaims: number
  uniqueBeneficiaries: number
  averageVisitsPerBeneficiary: number
  averageClaimAmount: number
  maxPayout: number
  inpatientClaimShare: number
  anyClaimAfterDeath: boolean
  primaryState: string
  primaryStateName: string
  firstClaimDate: string | null
  lastClaimDate: string | null
  reasons: string[]
}

export type ProviderListRow = {
  id: string
  score: number
  tier: RiskTier
  totalMoneyClaimed: number
  uniqueBeneficiaries: number
  primaryState: string
  primaryStateName: string
  lastClaimDate: string | null
}

export type ProviderSearchHit = {
  id: string
  score: number
  tier: RiskTier
  primaryStateName: string
}

export type FeatureImportance = {
  feature: string
  importance: number
}

export type ModelMetrics = {
  validationRocAuc: number
  validationAveragePrecision: number
  trainingRowsBeforeSmote: number
  trainingRowsAfterSmote: number
  validationRows: number
  fraudRateInValidation: number
}

export type MetaResponse = {
  minClaimDate: string | null
  maxClaimDate: string | null
  states: string[]
  metrics: ModelMetrics | null
  featureImportance: FeatureImportance[]
}

export type AnalyticsResponse = {
  kpis: {
    scanned: number
    highRisk: number
    exposure: number
    highShare: number
  }
  geo: { state: string; providers: number }[]
  mix: { tier: string; count: number }[]
  queue: ProviderListRow[]
  featureImportance: FeatureImportance[]
  metrics: ModelMetrics
  minClaimDate: string | null
  maxClaimDate: string | null
  states: string[]
}

export type PredictFeature = {
  name: string
  label: string
  kind: "feature" | "skip"
  median: number | null
}

export type PredictResult = {
  fraudProbability: number
  providerRiskScore: number
  riskTier: RiskTier
  featuresUsed: number
  featuresImputed: number
}

export type ProvidersPage = {
  rows: ProviderListRow[]
  total: number
  page: number
  pageSize: number
}
