"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import IconAvatar from "@/lib/icon-avatar";

interface RelatedRole {
  canonical_name: string;
  slug: string;
  overlap_count: number;
  total_postings: number;
}

interface RelatedRolesSectionProps {
  roles: RelatedRole[];
}

export function RelatedRolesSection({ roles }: RelatedRolesSectionProps) {
  if (roles.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Section heading — matches "Top Hiring Companies" style on the same page */}
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-primary" />
        <h2
          className="text-xl font-bold text-slate-800"
          style={{ fontFamily: "var(--font-geist-mono), monospace" }}
        >
          You Might Also Explore
        </h2>
      </div>

      {/* Cards grid: 2-col mobile → 5-col large */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {roles.map((role) => {
          const pct = Math.round((role.overlap_count / 10) * 100);

          return (
            <Link
              key={role.slug}
              href={`/roles/${role.slug}`}
              aria-label={`Explore ${role.canonical_name}`}
              className="group block border border-border bg-card p-4 transition-all duration-200
                         hover:border-primary/40
                         hover:shadow-[0_0_14px_color-mix(in_srgb,var(--primary)_12%,transparent_88%)]"
              style={{ borderRadius: "var(--radius)" }}
            >
              {/* Top row: icon + jobs badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <IconAvatar title={role.canonical_name} size={32} />
                <span
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground
                             border border-border px-1.5 py-0.5 shrink-0"
                  style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    borderRadius: "var(--radius)",
                  }}
                >
                  {role.total_postings.toLocaleString()} jobs
                </span>
              </div>

              {/* Role title with terminal > prefix */}
              <div className="flex items-baseline gap-1 mb-3 min-h-[2.5rem]">
                <span className="text-xs font-bold text-primary shrink-0">&gt;</span>
                <span
                  className="text-sm font-bold text-foreground leading-snug
                             group-hover:text-primary transition-colors duration-150"
                  style={{ fontFamily: "var(--font-geist-mono), monospace" }}
                >
                  {role.canonical_name}
                </span>
              </div>

              {/* Overlap progress bar */}
              <div className="space-y-1.5">
                <div
                  className="h-1.5 overflow-hidden"
                  style={{
                    background: "var(--muted)",
                    borderRadius: "var(--radius)",
                  }}
                >
                  <div
                    className="h-full transition-all duration-700 ease-out"
                    style={{
                      width: `${pct}%`,
                      background: "var(--primary)",
                      boxShadow:
                        "0 0 8px color-mix(in srgb, var(--primary) 55%, transparent 45%)",
                      borderRadius: "var(--radius)",
                    }}
                  />
                </div>
                <p
                  className="text-[10px] uppercase tracking-widest text-muted-foreground"
                  style={{ fontFamily: "var(--font-geist-mono), monospace" }}
                >
                  {role.overlap_count}/10 skills matched
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
