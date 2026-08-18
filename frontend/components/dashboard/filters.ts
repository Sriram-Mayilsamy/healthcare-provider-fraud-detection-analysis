"use client"

import * as React from "react"
import type { DateRange } from "react-day-picker"

import type { RiskTier } from "@/lib/types"

export type DashboardFilters = {
  tier: "all" | RiskTier
  state: string
  range: DateRange | undefined
}

export function useDashboardFilters(): [
  DashboardFilters,
  React.Dispatch<React.SetStateAction<DashboardFilters>>,
] {
  const [filters, setFilters] = React.useState<DashboardFilters>({
    tier: "all",
    state: "all",
    range: undefined,
  })

  return [filters, setFilters]
}
