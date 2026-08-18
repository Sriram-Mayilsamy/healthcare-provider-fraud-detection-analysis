"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ActivityIcon, GaugeIcon, LayoutDashboardIcon, SearchIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const nav = [
  { href: "/", label: "Analytics", icon: LayoutDashboardIcon },
  { href: "/providers", label: "Providers", icon: SearchIcon },
  { href: "/predict", label: "Predict", icon: GaugeIcon },
]

export function AppSidebar() {
  const pathname = usePathname()

  // Don't show sidebar on login/register pages
  if (pathname === "/login" || pathname === "/register") {
    return null
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary/20 text-sidebar-primary">
                <ActivityIcon className="size-4" />
              </div>
              <div className="grid text-left text-sm leading-tight">
                <span className="font-medium">Provider Risk</span>
                <span className="text-xs text-muted-foreground">Intelligence</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 text-[11px] leading-relaxed text-muted-foreground group-data-[collapsible=icon]:hidden">
          Scores prioritize investigation. They are not a fraud determination.
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
