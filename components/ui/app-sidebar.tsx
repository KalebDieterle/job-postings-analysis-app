"use client";

import {
  BarChart3,
  Briefcase,
  Building2,
  Home,
  Sparkles,
  MapPin,
  TrendingUp,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
} from "@/components/ui/sidebar";

// Menu items
const navigationItems = [
  {
    title: "Overview",
    url: "/",
    icon: Home,
  },
  {
    title: "Job Roles",
    url: "/roles",
    icon: Briefcase,
  },
  {
    title: "Skills",
    url: "/skills",
    icon: Wrench,
  },
  {
    title: "Companies",
    url: "/companies",
    icon: Building2,
  },
  {
    title: "Locations",
    url: "/locations",
    icon: MapPin,
  },
  {
    title: "Trends",
    url: "/trends",
    icon: TrendingUp,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4 group-data-[collapsible=icon]:px-2">
        <Link href="/" className="group/brand flex items-center gap-3">
          <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 text-white shadow-lg ring-1 ring-white/20 transition-transform duration-300 group-hover/brand:scale-105 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
            <BarChart3 className="h-5 w-5 transition-transform duration-300 group-hover/brand:scale-110" />
            <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-sidebar text-sidebar-primary p-0.5 shadow-sm" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h2 className="text-base font-semibold tracking-tight text-sidebar-foreground">
              SkillMap
            </h2>
            <p className="text-xs uppercase tracking-[0.14em] text-sidebar-foreground/60">
              Market Intelligence
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive =
                  item.url === "/"
                    ? pathname === "/"
                    : pathname === item.url || pathname.startsWith(`${item.url}/`);

                return (
                  <SidebarMenuItem key={item.title}>
                    <span
                      className={`absolute inset-y-1 left-0 w-1 rounded-r-full bg-sidebar-primary transition-all duration-300 ${
                        isActive
                          ? "opacity-100 scale-y-100"
                          : "opacity-0 scale-y-75"
                      }`}
                      aria-hidden="true"
                    />
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="transition-all duration-300 ease-out hover:translate-x-1 data-[active=true]:translate-x-1 data-[active=true]:bg-sidebar-primary/10 data-[active=true]:shadow-sm"
                    >
                      <Link href={item.url}>
                        <item.icon className="transition-transform duration-300 group-hover/menu-item:scale-110" />
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

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-xs text-sidebar-foreground/70 transition-colors duration-300 hover:bg-sidebar-accent/60 group-data-[collapsible=icon]:hidden">
          <p className="font-medium text-sidebar-foreground/80">Live Dataset</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.1em]">
            Powered by LinkedIn data and Adzuna API
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
