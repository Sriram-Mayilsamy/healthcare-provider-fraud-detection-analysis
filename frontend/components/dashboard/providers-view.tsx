"use client"

import * as React from "react"
import { ChevronsUpDownIcon, MoreHorizontalIcon } from "lucide-react"
import { toast } from "sonner"

import { DashboardToolbar } from "@/components/dashboard/toolbar"
import { useDashboardFilters } from "@/components/dashboard/filters"
import { useInspect } from "@/components/dashboard/inspect-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  exportProviders,
  getMeta,
  getProvider,
  getProviders,
  searchProviders,
} from "@/lib/api"
import { downloadCsv, formatNumber, formatUsd, tierBadgeVariant } from "@/lib/format"
import type { MetaResponse, ProviderRow, ProviderSearchHit, ProvidersPage } from "@/lib/types"

const PAGE_SIZE = 12

export function ProvidersView() {
  const { inspect, setSelected } = useInspect()
  const [filters, setFilters] = useDashboardFilters()
  const [exportOpen, setExportOpen] = React.useState(false)
  const [page, setPage] = React.useState(1)
  const [checked, setChecked] = React.useState<string[]>([])
  const [meta, setMeta] = React.useState<MetaResponse | null>(null)
  const [table, setTable] = React.useState<ProvidersPage | null>(null)
  const [lookup, setLookup] = React.useState<ProviderRow | null>(null)
  const [hits, setHits] = React.useState<ProviderSearchHit[]>([])
  const [search, setSearch] = React.useState("")
  const [comboboxOpen, setComboboxOpen] = React.useState(false)

  React.useEffect(() => {
    getMeta().then(setMeta).catch(() => toast.error("Could not load filters"))
  }, [])

  React.useEffect(() => {
    setPage(1)
    setChecked([])
  }, [filters])

  React.useEffect(() => {
    getProviders(filters, page, PAGE_SIZE)
      .then(setTable)
      .catch(() => toast.error("Could not load providers"))
  }, [filters, page])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      searchProviders(search)
        .then(setHits)
        .catch(() => null)
    }, 200)
    return () => window.clearTimeout(timer)
  }, [search, comboboxOpen])

  React.useEffect(() => {
    if (lookup) return
    searchProviders("")
      .then(async (results) => {
        setHits(results)
        if (results[0]) setLookup(await getProvider(results[0].id))
      })
      .catch(() => null)
  }, [lookup])

  const rows = table?.rows ?? []
  const total = table?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const allChecked = rows.length > 0 && rows.every((row) => checked.includes(row.id))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      <DashboardToolbar
        title="Providers"
        caption="Deep-dive lookup and a paginated investigation table."
        filters={filters}
        onFiltersChange={setFilters}
        states={meta?.states ?? []}
        minDate={meta?.minClaimDate ? new Date(meta.minClaimDate) : undefined}
        maxDate={meta?.maxClaimDate ? new Date(meta.maxClaimDate) : undefined}
        exportCount={checked.length > 0 ? checked.length : total}
        exportOpen={exportOpen}
        onExportOpenChange={setExportOpen}
        onExport={async () => {
          const selected = await exportProviders(filters, checked)
          downloadCsv(
            "providers.csv",
            selected.map((row) => ({
              Provider: row.id,
              RiskScore: row.score.toFixed(1),
              RiskTier: row.tier,
              State: row.primaryStateName,
              TotalMoneyClaimed: row.totalMoneyClaimed,
              UniqueBeneficiaries: row.uniqueBeneficiaries,
            }))
          )
          toast.success(`Exported ${selected.length} providers`)
        }}
      />

      <Tabs defaultValue="lookup">
        <TabsList>
          <TabsTrigger value="lookup">Deep-dive lookup</TabsTrigger>
          <TabsTrigger value="table">Provider table</TabsTrigger>
        </TabsList>
        <TabsContent value="lookup" className="mt-4 space-y-6">
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger render={<Button variant="outline" className="w-full max-w-md justify-between" />}>
              <span className="font-mono">{lookup?.id || "Search by Provider ID"}</span>
              <ChevronsUpDownIcon />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search Provider ID"
                  value={search}
                  onValueChange={setSearch}
                />
                <CommandList>
                  <CommandEmpty>No provider found.</CommandEmpty>
                  <CommandGroup>
                    {hits.map((provider) => (
                      <CommandItem
                        key={provider.id}
                        value={provider.id}
                        onSelect={() => {
                          void getProvider(provider.id).then((row) => {
                            setLookup(row)
                            setComboboxOpen(false)
                          })
                        }}
                      >
                        <span className="font-mono">{provider.id}</span>
                        <span className="text-muted-foreground">{provider.tier}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {lookup ? (
            <LookupCard provider={lookup} onInspect={() => setSelected(lookup)} />
          ) : null}
        </TabsContent>
        <TabsContent value="table" className="mt-4 space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(value) => {
                      if (value) {
                        setChecked([...new Set([...checked, ...rows.map((row) => row.id)])])
                      } else {
                        const pageIds = new Set(rows.map((row) => row.id))
                        setChecked(checked.filter((id) => !pageIds.has(id)))
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Claimed</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => void inspect(row.id)}>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      checked={checked.includes(row.id)}
                      onCheckedChange={(value) => {
                        setChecked((current) =>
                          value ? [...current, row.id] : current.filter((id) => id !== row.id)
                        )
                      }}
                    />
                  </TableCell>
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
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => void inspect(row.id)}>
                          Inspect
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            await navigator.clipboard.writeText(row.id)
                            toast.success("Copied provider ID")
                          }}
                        >
                          Copy ID
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              {total.toLocaleString()} providers · page {page} of {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function LookupCard({
  provider,
  onInspect,
}: {
  provider: ProviderRow
  onInspect: () => void
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="px-1 py-4 sm:px-4">
          <p className="text-xs text-muted-foreground">Provider risk score</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatNumber(provider.score, 1)}
            <span className="text-sm font-normal text-muted-foreground"> / 100</span>
          </p>
        </div>
        <div className="px-1 py-4 sm:px-4">
          <p className="text-xs text-muted-foreground">Risk tier</p>
          <div className="mt-2">
            <Badge variant={tierBadgeVariant(provider.tier)}>{provider.tier}</Badge>
          </div>
        </div>
        <div className="px-1 py-4 sm:px-4">
          <p className="text-xs text-muted-foreground">Total money claimed</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatUsd(provider.totalMoneyClaimed)}
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-medium">Why this provider received this score</h2>
        {provider.reasons.length > 0 ? (
          <ul className="space-y-2 text-sm text-muted-foreground">
            {provider.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            This provider is not High Risk, so no high-risk SHAP review narrative was generated.
          </p>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={onInspect}>
        Open inspector
      </Button>
    </div>
  )
}
