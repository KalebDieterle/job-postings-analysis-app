"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  label: string;
  count?: number;
}

interface CategoryFilterProps {
  categories: Category[];
  selected?: string;
  onSelect?: (id: string) => void;
}

export function CategoryFilter({
  categories,
  selected,
  onSelect,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <Badge
          key={category.id}
          variant={selected === category.id ? "default" : "outline"}
          className={cn(
            "cursor-pointer transition-all hover:scale-105",
            selected === category.id
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted",
          )}
          onClick={() => onSelect?.(category.id)}
        >
          {category.label}
          {category.count !== undefined && (
            <span className="ml-1 opacity-60">({category.count})</span>
          )}
        </Badge>
      ))}
    </div>
  );
}
