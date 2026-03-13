import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Building2,
  Home,
  MapPin,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
} from "lucide-react";

export type MobileNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  matchMode: "exact" | "prefix";
  priority: number;
};

export type RouteMetadata = {
  title: string;
  navHref: string | null;
};

export const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { label: "Overview", href: "/", icon: Home, matchMode: "exact", priority: 1 },
  {
    label: "Roles",
    href: "/roles",
    icon: Briefcase,
    matchMode: "prefix",
    priority: 2,
  },
  {
    label: "Skills",
    href: "/skills",
    icon: Wrench,
    matchMode: "prefix",
    priority: 3,
  },
  {
    label: "Companies",
    href: "/companies",
    icon: Building2,
    matchMode: "prefix",
    priority: 4,
  },
  {
    label: "Locations",
    href: "/locations",
    icon: MapPin,
    matchMode: "prefix",
    priority: 5,
  },
];

export const DRAWER_SECONDARY_ITEMS = [
  {
    title: "Trends",
    url: "/trends",
    icon: TrendingUp,
  },
  {
    title: "Salary Predictor",
    url: "/intelligence/salary-predictor",
    icon: Sparkles,
  },
  {
    title: "Backend",
    url: "/admin",
    icon: ShieldCheck,
  },
] as const;

const ROUTE_RULES: Array<{
  test: (pathname: string) => boolean;
  title: string;
  navHref: string | null;
}> = [
  { test: (pathname) => pathname === "/", title: "Overview", navHref: "/" },
  {
    test: (pathname) => pathname === "/roles",
    title: "Explore Roles",
    navHref: "/roles",
  },
  {
    test: (pathname) => pathname.startsWith("/roles/"),
    title: "Role Details",
    navHref: "/roles",
  },
  {
    test: (pathname) => pathname === "/skills",
    title: "Skills Explorer",
    navHref: "/skills",
  },
  {
    test: (pathname) => pathname.startsWith("/skills/"),
    title: "Skill Details",
    navHref: "/skills",
  },
  {
    test: (pathname) => pathname === "/companies",
    title: "Company Explorer",
    navHref: "/companies",
  },
  {
    test: (pathname) => pathname.startsWith("/companies/"),
    title: "Company Profile",
    navHref: "/companies",
  },
  {
    test: (pathname) => pathname === "/locations",
    title: "Location Explorer",
    navHref: "/locations",
  },
  {
    test: (pathname) => pathname.startsWith("/locations/"),
    title: "Location Details",
    navHref: "/locations",
  },
  {
    test: (pathname) => pathname === "/trends",
    title: "Market Momentum",
    navHref: null,
  },
  {
    test: (pathname) => pathname.startsWith("/intelligence/salary-predictor"),
    title: "Salary Predictor",
    navHref: null,
  },
  {
    test: (pathname) => pathname.startsWith("/intelligence"),
    title: "Intelligence",
    navHref: null,
  },
  {
    test: (pathname) => pathname.startsWith("/admin"),
    title: "Backend Data",
    navHref: null,
  },
];

export function getRouteMetadata(pathname: string): RouteMetadata {
  const match = ROUTE_RULES.find((rule) => rule.test(pathname));
  if (match) {
    return { title: match.title, navHref: match.navHref };
  }

  return {
    title: "Job Market Analytics",
    navHref: null,
  };
}

export function isNavItemActive(pathname: string, item: MobileNavItem): boolean {
  if (item.matchMode === "exact") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

