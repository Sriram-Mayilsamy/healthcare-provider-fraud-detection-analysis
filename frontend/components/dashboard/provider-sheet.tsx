"use client"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useInspect } from "@/components/dashboard/inspect-context"
import { formatNumber, formatPercent, formatUsd, tierBadgeVariant } from "@/lib/format"

export function ProviderSheet() {
  const { selected, setSelected } = useInspect()

  return (
    <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        {selected ? (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="font-mono">{selected.id}</SheetTitle>
              <SheetDescription>
                Why this provider received this score
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Risk score</p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatNumber(selected.score, 1)}
                    <span className="text-sm font-normal text-muted-foreground"> / 100</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total claimed</p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {formatUsd(selected.totalMoneyClaimed)}
                  </p>
                </div>
              </div>
              <Badge variant={tierBadgeVariant(selected.tier)}>{selected.tier}</Badge>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Model narrative</h3>
                {selected.reasons.length > 0 ? (
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {selected.reasons.map((reason) => (
                      <li key={reason} className="leading-relaxed">
                        {reason}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This provider is not High Risk, so no high-risk SHAP review
                    narrative was generated.
                  </p>
                )}
              </div>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Provider snapshot</h3>
                <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
                  <Snapshot label="Unique beneficiaries" value={formatNumber(selected.uniqueBeneficiaries)} />
                  <Snapshot
                    label="Avg visits / beneficiary"
                    value={formatNumber(selected.averageVisitsPerBeneficiary, 2)}
                  />
                  <Snapshot label="Average claim amount" value={formatUsd(selected.averageClaimAmount)} />
                  <Snapshot label="Max payout" value={formatUsd(selected.maxPayout)} />
                  <Snapshot
                    label="Inpatient claim share"
                    value={formatPercent(selected.inpatientClaimShare)}
                  />
                  <Snapshot
                    label="Any claim after death"
                    value={selected.anyClaimAfterDeath ? "Yes" : "No"}
                  />
                  <Snapshot label="Primary state" value={selected.primaryStateName} />
                  <Snapshot label="Total claims" value={formatNumber(selected.totalClaims)} />
                </dl>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </>
  )
}
