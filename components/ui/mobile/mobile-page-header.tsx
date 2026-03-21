import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type MobilePageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  compact?: boolean;
  className?: string;
};

export function MobilePageHeader({
  title,
  subtitle,
  actions,
  compact = false,
  className,
}: MobilePageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 md:gap-3",
        !compact && "md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="space-y-1.5">
        {/* Terminal breadcrumb */}
        <p className="term-label">{">"} SKILLMAP_ANALYTICS</p>

        <h1 className="text-xl font-bold tracking-tight md:text-3xl text-foreground">
          <span className="text-muted-foreground font-normal">SkillMap: </span>
          <span style={{ color: "var(--primary)" }}>{title}</span>
          <span className="term-cursor ml-1 text-xl md:text-3xl" />
        </h1>

        {subtitle && (
          <p className="text-xs text-muted-foreground md:text-sm max-w-2xl">
            {"// "}{subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}
