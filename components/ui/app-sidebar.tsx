"use client";

import { Activity, BarChart3 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DRAWER_SECONDARY_ITEMS,
  MOBILE_NAV_ITEMS,
} from "@/lib/mobile-route-meta";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// twMerge (inside cn used by SidebarMenuButton) will resolve conflicts in favour
// of these overrides since they appear last in the cn() call inside the primitive.
const NAV_BUTTON_CLASS =
  "rounded-lg px-3 text-sidebar-foreground/60 transition-colors duration-100 " +
  "hover:bg-sidebar-accent hover:text-sidebar-foreground " +
  "data-[active=true]:bg-sidebar-primary/10 data-[active=true]:text-sidebar-primary data-[active=true]:font-semibold";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      {/* ── Brand header ── */}
      <SidebarHeader className="px-4 py-5 group-data-[collapsible=icon]:px-2">
        <Link href="/" className="group/brand flex items-center gap-3">
          {/* Icon mark */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm ring-1 ring-sidebar-primary/25 transition-shadow duration-200 group-hover/brand:shadow-md group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
            <BarChart3 className="h-5 w-5" strokeWidth={2} />
          </div>
          {/* Wordmark */}
          <div className="overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="block text-[15px] font-bold leading-none tracking-tight text-sidebar-foreground">
              SkillMap
            </span>
            <span className="mt-1.5 block text-[10px] font-medium uppercase leading-none tracking-[0.2em] text-sidebar-foreground/40">
              Market Intelligence
            </span>
          </div>
        </Link>
      </SidebarHeader>

      {/* ── Navigation ── */}
      <SidebarContent className="px-2">
        {/* Primary section */}
        <SidebarGroup className="p-0 pt-2">
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/35 group-data-[collapsible=icon]:hidden">
            Explore
          </p>
          <SidebarGroupContent>
            <SidebarMenu>
              {MOBILE_NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={NAV_BUTTON_CLASS}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Divider */}
        <div className="mx-3 my-2 border-t border-sidebar-border group-data-[collapsible=icon]:mx-2" />

        {/* Tools section */}
        <SidebarGroup className="p-0">
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/35 group-data-[collapsible=icon]:hidden">
            Tools
          </p>
          <SidebarGroupContent>
            <SidebarMenu>
              {DRAWER_SECONDARY_ITEMS.map((item) => {
                const isActive =
                  pathname === item.url ||
                  pathname.startsWith(`${item.url}/`);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={NAV_BUTTON_CLASS}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer — live data status ── */}
      <SidebarFooter className="px-3 pb-5 pt-2 group-data-[collapsible=icon]:px-2">
        {/* Expanded state */}
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 px-3 py-2.5 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <div>
              <p className="text-[11px] font-semibold leading-none text-sidebar-foreground/80">
                Live Dataset
              </p>
              <p className="mt-1 text-[10px] leading-none text-sidebar-foreground/40">
                Powered by Adzuna API
              </p>
            </div>
          </div>
        </div>
        {/* Collapsed icon state */}
        <div className="hidden items-center justify-center py-2 group-data-[collapsible=icon]:flex">
          <Activity className="h-4 w-4 text-emerald-500" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
