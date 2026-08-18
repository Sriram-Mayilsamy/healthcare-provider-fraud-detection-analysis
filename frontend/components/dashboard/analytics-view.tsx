"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { toast } from "sonner"
import { MoreHorizontalIcon } from "lucide-react"

import { DashboardToolbar } from "@/components/dashboard/toolbar"
import { useDashboardFilters } from "@/components/dashboard/filters"
import { useInspect } from "@/components/dashboard/inspect-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { exportProviders, getAnalytics } from "@/lib/api"
import { downloadCsv, formatFeatureName, formatNumber, formatPercent, formatUsd, tierBadgeVariant } from "@/lib/format"
import type { AnalyticsResponse } from "@/lib/types"

const geoConfig = {
  providers: { label: "High-risk providers", color: "var(--chart-5)" },
} satisfies ChartConfig

const mixConfig = {
  count: { label: "Providers", color: "var(--chart-2)" },
} satisfies ChartConfig

const importanceConfig = {
  importance: { label: "Importance", color: "var(--chart-3)" },
} satisfies ChartConfig

export function AnalyticsView() {
  const { inspect } = useInspect()
  const [filters, setFilters] = useDashboardFilters()
  const [exportOpen, setExportOpen] = React.useState(false)
  const [data, setData] = React.useState<AnalyticsResponse | null>(null)

  React.useEffect(() => {
    getAnalytics(filters)
      .then(setData)
      .catch(() => toast.error("Could not load analytics"))
  }, [filters])

  const importance = (data?.featureImportance ?? []).map((item) => ({
    feature: formatFeatureName(item.feature),
    importance: Number((item.importance * 100).toFixed(1)),
  }))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6">
      <DashboardToolbar
        title="Analytics"
        caption="Fraud risk is a probability-based model signal for investigation prioritization."
        filters={filters}
        onFiltersChange={setFilters}
        states={data?.states ?? []}
        minDate={data?.minClaimDate ? new Date(data.minClaimDate) : undefined}
        maxDate={data?.maxClaimDate ? new Date(data.maxClaimDate) : undefined}
        exportCount={data?.kpis.scanned ?? 0}
        exportOpen={exportOpen}
        onExportOpenChange={setExportOpen}
        onExport={async () => {
          const rows = await exportProviders(filters)
          downloadCsv(
            "provider-risk.csv",
            rows.map((row) => ({
              Provider: row.id,
              RiskScore: row.score.toFixed(1),
              RiskTier: row.tier,
              State: row.primaryStateName,
              TotalMoneyClaimed: row.totalMoneyClaimed,
            }))
          )
          toast.success(`Exported ${rows.length} providers`)
        }}
      />

      <section className="grid grid-cols-1 divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Kpi
          label="Providers scanned"
          value={formatNumber(data?.kpis.scanned ?? 0)}
          hint="Providers in the current filter set"
        />
        <Kpi
          label="High-risk providers"
          value={formatNumber(data?.kpis.highRisk ?? 0)}
          delta={formatPercent(data?.kpis.highShare ?? 0)}
          hint="Share of scanned providers in the High Risk tier"
        />
        <Kpi
          label="Potential revenue saved"
          value={formatUsd(data?.kpis.exposure ?? 0)}
          hint="Total claims exposure of High Risk providers, assuming timely review prevents payment"
        />
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">Geographic distribution</p>
          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl font-semibold tabular-nums">
              {formatNumber(data?.kpis.highRisk ?? 0)}
            </h2>
            <p className="text-sm text-muted-foreground">high-risk providers by state</p>
          </div>
        </div>
        <ChartContainer config={geoConfig} className="aspect-auto h-72">
          <BarChart data={data?.geo ?? []} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="state" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={36} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="providers" fill="var(--color-providers)" radius={4} />
          </BarChart>
        </ChartContainer>
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">Risk mix</p>
          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl font-semibold tabular-nums">
              {formatNumber(data?.kpis.scanned ?? 0)}
            </h2>
            <p className="text-sm text-muted-foreground">providers across Low / Medium / High</p>
          </div>
        </div>
        <ChartContainer config={mixConfig} className="aspect-auto h-56">
          <BarChart data={data?.mix ?? []} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="tier" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={36} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">What the model uses</p>
          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl font-semibold tabular-nums">
              {formatNumber(data?.metrics.validationRocAuc ?? 0, 3)}
            </h2>
            <p className="text-sm text-muted-foreground">
              validation ROC-AUC · top feature weights
            </p>
          </div>
        </div>
        <ChartContainer config={importanceConfig} className="aspect-auto h-80">
          <BarChart data={importance} layout="vertical" accessibilityLayer>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="feature"
              tickLine={false}
              axisLine={false}
              width={160}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="importance" fill="var(--color-importance)" radius={4} />
          </BarChart>
        </ChartContainer>
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Investigation queue</p>
            <h2 className="text-base font-medium">
              {filters.tier === "all" ? "Highest-risk providers" : "Matching providers"}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">Select a row to inspect</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Provider</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="text-right">Score</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Claimed</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.queue ?? []).map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => void inspect(row.id)}
              >
                <TableCell className="font-mono">{row.id}</TableCell>
                <TableCell>{row.primaryState}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNumber(row.score, 1)}
                </TableCell>
                <TableCell>
                  <Badge variant={tierBadgeVariant(row.tier)}>{row.tier}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatUsd(row.totalMoneyClaimed)}
                </TableCell>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-xs" />}
                    >
                      <MoreHorizontalIcon />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => void inspect(row.id)}>
                        Inspect
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  delta,
  hint,
}: {
  label: string
  value: string
  delta?: string
  hint: string
}) {
  return (
    <div className="px-1 py-4 sm:px-4">
      <Tooltip>
        <TooltipTrigger className="text-left">
          <span className="block text-xs text-muted-foreground">{label}</span>
          <span className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{value}</span>
            {delta ? (
              <span className="text-xs text-muted-foreground">{delta}</span>
            ) : null}
          </span>
        </TooltipTrigger>
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>
    </div>
  )
}
