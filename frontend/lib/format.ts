import type { RiskTier } from "@/lib/types"

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

export function formatPercent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`
}

export function formatFeatureName(feature: string) {
  return feature
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
}

export function tierBadgeVariant(tier: RiskTier) {
  if (tier === "High Risk") return "destructive" as const
  if (tier === "Medium Risk") return "warning" as const
  return "success" as const
}

export function downloadCsv(filename: string, rows: Record<string, string | number | boolean>[]) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const body = rows
    .map((row) =>
      headers
        .map((header) => {
          const value = String(row[header] ?? "")
          return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
        })
        .join(",")
    )
    .join("\n")
  const blob = new Blob([`${headers.join(",")}\n${body}`], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
