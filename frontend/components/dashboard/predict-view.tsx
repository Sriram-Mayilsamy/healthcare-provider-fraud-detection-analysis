"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getPredictFeatures, postPredict } from "@/lib/api"
import { formatNumber, formatPercent, tierBadgeVariant } from "@/lib/format"
import type { PredictFeature, PredictResult } from "@/lib/types"

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let cell = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      cells.push(cell.trim())
      cell = ""
    } else if (char !== "\r") {
      cell += char
    }
  }

  cells.push(cell.trim())
  return cells
}

function dataLine(text: string) {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return ""
  if (lines.length > 1 && /^(provider|totalclaims)\b/i.test(lines[0].replaceAll('"', ""))) {
    return lines[lines.length - 1]
  }
  return lines[0]
}

function splitRow(text: string) {
  const line = dataLine(text)
  if (!line) return []
  const tabs = line.split("\t")
  const commas = parseCsvLine(line)
  return tabs.length > commas.length ? tabs.map((cell) => cell.trim()) : commas
}

export function PredictView() {
  const [features, setFeatures] = React.useState<PredictFeature[]>([])
  const [values, setValues] = React.useState<Record<string, string>>({})
  const [paste, setPaste] = React.useState("")
  const [result, setResult] = React.useState<PredictResult | null>(null)
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    getPredictFeatures()
      .then((payload) => setFeatures(payload.features))
      .catch(() => toast.error("Could not load scoring schema. Is the predict API running?"))
  }, [])

  function fillFromPaste(raw: string) {
    const cells = splitRow(raw)
    if (cells.length === 0 || features.length === 0) return 0

    const next: Record<string, string> = {}
    features.forEach((feature, index) => {
      const cell = cells[index] ?? ""
      if (cell !== "" && cell.toLowerCase() !== "nan") {
        next[feature.name] = cell
      }
    })
    setValues(next)
    setResult(null)
    return Object.keys(next).length
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const payload: Record<string, number> = {}
    for (const feature of features) {
      if (feature.kind !== "feature") continue
      const raw = values[feature.name]
      if (!raw || raw.trim() === "") continue
      const parsed = Number(raw)
      if (!Number.isFinite(parsed)) continue
      payload[feature.name] = parsed
    }
    setPending(true)
    try {
      setResult(await postPredict(payload))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Prediction failed")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Score a provider</h1>
        <p className="text-sm text-muted-foreground">
          Fields follow <span className="font-mono">test_provider_consolidated.csv</span> column
          order. Paste one CSV row to fill the form.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <form className="space-y-6" onSubmit={(event) => void onSubmit(event)}>
          <label className="block space-y-1 text-xs">
            <span className="text-muted-foreground">
              Paste a comma-separated row (optional header is ignored)
            </span>
            <Textarea
              value={paste}
              className="min-h-24 font-mono text-xs"
              placeholder="PRV51002,205,0,169,2009-01-02,2009-12-30,53790,..."
              onChange={(event) => {
                const next = event.target.value
                setPaste(next)
                if (next.trim()) fillFromPaste(next)
              }}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <label key={feature.name} className="space-y-1 text-xs">
                <span className="text-muted-foreground">{feature.label}</span>
                <Input
                  type={feature.kind === "feature" ? "number" : "text"}
                  step={feature.kind === "feature" ? "any" : undefined}
                  readOnly={feature.kind === "skip"}
                  value={values[feature.name] ?? ""}
                  placeholder={
                    feature.kind === "skip"
                      ? "From CSV row"
                      : feature.median === null || feature.median === undefined
                        ? "Median"
                        : String(Number(feature.median.toPrecision(4)))
                  }
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [feature.name]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending || features.length === 0}>
              {pending ? "Scoring…" : "Predict"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setValues({})
                setPaste("")
                setResult(null)
              }}
            >
              Clear
            </Button>
          </div>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <p className="text-xs text-muted-foreground">Prediction</p>
          {result ? (
            <div className="space-y-4 border-y py-4">
              <div>
                <p className="text-xs text-muted-foreground">Provider risk score</p>
                <p className="text-3xl font-semibold tabular-nums">
                  {formatNumber(result.providerRiskScore, 1)}
                  <span className="text-sm font-normal text-muted-foreground"> / 100</span>
                </p>
              </div>
              <Badge variant={tierBadgeVariant(result.riskTier)}>{result.riskTier}</Badge>
              <Separator />
              <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-sm">
                <dt className="text-muted-foreground">Fraud probability</dt>
                <dd className="tabular-nums">{formatPercent(result.fraudProbability)}</dd>
                <dt className="text-muted-foreground">Fields supplied</dt>
                <dd className="tabular-nums">{result.featuresUsed}</dd>
                <dt className="text-muted-foreground">Median-imputed</dt>
                <dd className="tabular-nums">{result.featuresImputed}</dd>
              </dl>
              {result.reasons && result.reasons.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Top risk factors</p>
                    <ul className="space-y-1 text-xs">
                      {result.reasons.map((reason, index) => (
                        <li key={index} className="text-foreground">
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Copy one row from the CSV, paste it above, then predict. Low ≤ 40, Medium ≤ 75,
              High &gt; 75.
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
