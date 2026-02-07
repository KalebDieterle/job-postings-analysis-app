"use client";

import { Button } from "@/components/ui/button";
import { Grid3x3, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryState } from "nuqs";
import { skillsSearchParamsParser } from "@/lib/skills-search-params";

export function ViewToggle() {
  const [view, setView] = useQueryState(
    "view",
    skillsSearchParamsParser.view.withDefault("grid"),
  );

  return (
    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setView("grid")}
        className={cn(
          "h-8 w-8 p-0",
          view === "grid"
            ? "bg-white dark:bg-slate-900 shadow-sm"
            : "hover:bg-slate-200 dark:hover:bg-slate-700",
        )}
      >
        <Grid3x3 className="h-4 w-4" />
        <span className="sr-only">Grid view</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setView("table")}
        className={cn(
          "h-8 w-8 p-0",
          view === "table"
            ? "bg-white dark:bg-slate-900 shadow-sm"
            : "hover:bg-slate-200 dark:hover:bg-slate-700",
        )}
      >
        <List className="h-4 w-4" />
        <span className="sr-only">Table view</span>
      </Button>
    </div>
  );
}
