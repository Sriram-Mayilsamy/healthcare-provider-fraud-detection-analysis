"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOutIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useInspect } from "@/components/dashboard/inspect-context"
import { useAuth } from "@/lib/auth-context"
import { searchProviders } from "@/lib/api"
import { formatNumber } from "@/lib/format"
import type { ProviderSearchHit } from "@/lib/types"

export function SiteHeader() {
  const pathname = usePathname()
  const { inspect } = useInspect()
  const { user, logout } = useAuth()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [hits, setHits] = React.useState<ProviderSearchHit[]>([])

  // Don't show header on login/register pages
  if (pathname === "/login" || pathname === "/register") {
    return null
  }

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  React.useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      searchProviders(query).then(setHits).catch(() => setHits([]))
    }, 200)
    return () => window.clearTimeout(timer)
  }, [open, query])

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>Risk</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {pathname === "/providers"
                ? "Providers"
                : pathname === "/predict"
                  ? "Predict"
                  : "Analytics"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Button
        variant="outline"
        size="sm"
        className="ml-auto max-w-72 justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
        <span className="flex-1 text-left">Search providers</span>
        <kbd className="pointer-events-none hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </Button>
      {user && (
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="gap-2"
        >
          <LogOutIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      )}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search providers"
        description="Jump to a provider risk profile"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by provider ID, state, or tier..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No provider found.</CommandEmpty>
            <CommandGroup heading="Providers">
              {hits.map((provider) => (
                <CommandItem
                  key={provider.id}
                  value={provider.id}
                  onSelect={() => {
                    void inspect(provider.id)
                    setOpen(false)
                  }}
                >
                  <span className="font-mono">{provider.id}</span>
                  <span className="text-muted-foreground">
                    {formatNumber(provider.score, 1)} · {provider.tier}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </header>
  )
}
