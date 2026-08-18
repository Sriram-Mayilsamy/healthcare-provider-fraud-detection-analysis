"use client"

import * as React from "react"

import { getProvider } from "@/lib/api"
import type { ProviderRow } from "@/lib/types"

type InspectContextValue = {
  selected: ProviderRow | null
  setSelected: (provider: ProviderRow | null) => void
  inspect: (id: string) => Promise<void>
}

const InspectContext = React.createContext<InspectContextValue | null>(null)

export function InspectProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = React.useState<ProviderRow | null>(null)

  const inspect = React.useCallback(async (id: string) => {
    const provider = await getProvider(id)
    setSelected(provider)
  }, [])

  const value = React.useMemo(
    () => ({ selected, setSelected, inspect }),
    [selected, inspect]
  )

  return <InspectContext.Provider value={value}>{children}</InspectContext.Provider>
}

export function useInspect() {
  const context = React.useContext(InspectContext)
  if (!context) {
    throw new Error("useInspect must be used within InspectProvider")
  }
  return context
}
