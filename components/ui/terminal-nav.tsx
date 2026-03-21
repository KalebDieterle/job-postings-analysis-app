"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { getRouteMetadata } from "@/lib/mobile-route-meta";

const NAV_LINKS = [
  { label: "DASHBOARD", href: "/" },
  { label: "TRENDS", href: "/trends" },
  { label: "SKILLS", href: "/skills" },
  { label: "ROLES", href: "/roles" },
  { label: "COMPANIES", href: "/companies" },
  { label: "LOCATIONS", href: "/locations" },
  { label: "SALARY", href: "/intelligence/salary-predictor" },
  { label: "BACKEND", href: "/admin" },
] as const;

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TerminalNav() {
  const pathname = usePathname();
  const metadata = getRouteMetadata(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Build page title: "SkillMap: PageTitle"
  const pageTitle = metadata.title;

  return (
    <>
      <nav
        className="sticky top-0 z-50 border-b border-border"
        style={{ background: "color-mix(in srgb, #080e0c 96%, #1a3028 4%)" }}
      >
        <div className="flex h-12 items-center justify-between px-4 md:px-6">
          {/* Brand + page title */}
          <div className="flex items-center gap-0 min-w-0 max-w-[55vw] md:max-w-none">
            <Link
              href="/"
              className="text-sm font-bold tracking-wide text-foreground/90 hover:text-foreground transition-colors shrink-0"
              style={{ fontFamily: "var(--font-geist-mono), monospace" }}
            >
              SkillMap
            </Link>
            <span className="text-sm text-muted-foreground shrink-0">: </span>
            <span
              className="text-sm text-muted-foreground truncate"
              style={{ fontFamily: "var(--font-geist-mono), monospace" }}
            >
              {pageTitle}
            </span>
            <span className="text-sm text-primary ml-0.5 shrink-0 hidden sm:inline term-cursor" />
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href, pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs font-bold tracking-widest transition-colors duration-150"
                  style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    letterSpacing: "0.14em",
                    color: active ? "var(--primary)" : "var(--muted-foreground)",
                    textDecoration: active ? "underline" : "none",
                    textUnderlineOffset: "4px",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div
            className="md:hidden border-t border-border"
            style={{ background: "#0a1410" }}
          >
            {NAV_LINKS.map((link) => {
              const active = isActive(link.href, pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center px-4 py-3 text-xs font-bold tracking-widest border-b border-border/40 transition-colors"
                  style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    letterSpacing: "0.14em",
                    color: active ? "var(--primary)" : "var(--muted-foreground)",
                    background: active
                      ? "color-mix(in srgb, var(--primary) 5%, transparent 95%)"
                      : "transparent",
                  }}
                >
                  {active && (
                    <span className="mr-2 text-primary">{">"}</span>
                  )}
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </>
  );
}
