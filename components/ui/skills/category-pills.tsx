"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";

const categories = [
  { id: "all", label: "All Skills", count: 1284 },
  { id: "frontend", label: "Frontend", count: 342 },
  { id: "backend", label: "Backend", count: 428 },
  { id: "devops", label: "DevOps", count: 156 },
  { id: "data-science", label: "Data Science", count: 214 },
  { id: "mobile", label: "Mobile", count: 144 },
];

export function CategoryPills() {
  const [selected, setSelected] = useState("all");

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <Badge
          key={category.id}
          variant={selected === category.id ? "default" : "outline"}
          className={cn(
            "px-4 py-2 cursor-pointer transition-all hover:scale-105 text-xs font-bold uppercase tracking-wider",
            selected === category.id
              ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent hover:border-slate-300 dark:hover:border-slate-600",
          )}
          onClick={() => setSelected(category.id)}
        >
          {category.label}
          <span className="ml-1.5 opacity-60">({category.count})</span>
        </Badge>
      ))}
    </div>
  );
}
