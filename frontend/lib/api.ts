import { format } from "date-fns"

import type { DashboardFilters } from "@/components/dashboard/filters"
import type {
  AnalyticsResponse,
  MetaResponse,
  PredictFeature,
  PredictResult,
  ProviderListRow,
  ProviderRow,
  ProviderSearchHit,
  ProvidersPage,
} from "@/lib/types"

export function filterParams(filters: DashboardFilters, extra?: Record<string, string>) {
  const params = new URLSearchParams(extra)
  if (filters.tier !== "all") params.set("tier", filters.tier)
  if (filters.state !== "all") params.set("state", filters.state)
  if (filters.range?.from) params.set("from", format(filters.range.from, "yyyy-MM-dd"))
  if (filters.range?.to) params.set("to", format(filters.range.to, "yyyy-MM-dd"))
  return params
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export function getMeta() {
  return fetchJson<MetaResponse>("/api/meta")
}

export function getAnalytics(filters: DashboardFilters) {
  return fetchJson<AnalyticsResponse>(`/api/analytics?${filterParams(filters)}`)
}

export function getProviders(filters: DashboardFilters, page: number, pageSize = 12) {
  const params = filterParams(filters, {
    page: String(page),
    pageSize: String(pageSize),
  })
  return fetchJson<ProvidersPage>(`/api/providers?${params}`)
}

export function getProvider(id: string) {
  return fetchJson<ProviderRow>(`/api/providers/${encodeURIComponent(id)}`)
}

export function searchProviders(q: string) {
  const params = new URLSearchParams({ q, limit: "20" })
  return fetchJson<ProviderSearchHit[]>(`/api/providers/search?${params}`)
}

export function exportProviders(filters: DashboardFilters, ids: string[] = []) {
  const params = filterParams(filters)
  if (ids.length) params.set("ids", ids.join(","))
  return fetchJson<ProviderListRow[]>(`/api/providers/export?${params}`)
}

export function getPredictFeatures() {
  return fetchJson<{ features: PredictFeature[]; datasetColumns: string[] }>(
    "/ml/predict/features"
  )
}

export async function postPredict(payload: Record<string, number>) {
  const response = await fetch("/ml/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Request failed: ${response.status}`)
  }
  return response.json() as Promise<PredictResult>
}
