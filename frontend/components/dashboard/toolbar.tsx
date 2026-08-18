"use client"

import { DownloadIcon } from "lucide-react"

import { DateRangePicker } from "@/components/dashboard/date-range-picker"
import type { DashboardFilters } from "@/components/dashboard/filters"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { RiskTier } from "@/lib/types"

export function DashboardToolbar({
  title,
  caption,
  filters,
  onFiltersChange,
  states,
  minDate,
  maxDate,
  exportCount,
  onExport,
  exportOpen,
  onExportOpenChange,
}: {
  title: string
  caption: string
  filters: DashboardFilters
  onFiltersChange: (filters: DashboardFilters) => void
  states: string[]
  minDate?: Date
  maxDate?: Date
  exportCount: number
  onExport: () => void
  exportOpen: boolean
  onExportOpenChange: (open: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{caption}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            range={filters.range}
            onChange={(range) => onFiltersChange({ ...filters, range })}
            min={minDate}
            max={maxDate}
          />
          <Select
            value={filters.tier}
            onValueChange={(tier) => {
              if (!tier) return
              onFiltersChange({ ...filters, tier: tier as DashboardFilters["tier"] })
            }}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk tiers</SelectItem>
              {(["High Risk", "Medium Risk", "Low Risk"] as RiskTier[]).map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {tier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.state}
            onValueChange={(state) => {
              if (!state) return
              onFiltersChange({ ...filters, state: String(state) })
            }}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              {states.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => onExportOpenChange(true)}>
            <DownloadIcon />
            Export
          </Button>
        </div>
      </div>
      <Dialog open={exportOpen} onOpenChange={onExportOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export current view</DialogTitle>
            <DialogDescription>
              Download {exportCount.toLocaleString()} matching providers as CSV.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onExportOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onExport()
                onExportOpenChange(false)
              }}
            >
              Download CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
