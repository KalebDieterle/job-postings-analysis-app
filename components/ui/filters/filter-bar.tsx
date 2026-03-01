"use client";

import React, { useState, useTransition } from "react";
import { useQueryStates } from "nuqs";
import { searchParamsSchema } from "@/lib/search-params";
import {
  Loader2,
  Search,
  MapPin,
  Briefcase,
  DollarSign,
  X,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FilterBar() {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const [filters, setFilters] = useQueryStates(searchParamsSchema, {
    startTransition,
    shallow: false,
  });

  const activeFiltersCount =
    (filters.q ? 1 : 0) +
    (filters.location ? 1 : 0) +
    (filters.experience.length > 0 ? 1 : 0) +
    (filters.minSalary > 0 ? 1 : 0);

  const clearFilters = () => {
    setFilters({
      q: "",
      location: "",
      experience: [],
      minSalary: 0,
      page: 1,
    });
  };

  return (
    <div className="w-full space-y-2">
      <div
        className={`rounded-xl border bg-card p-3 shadow-sm transition-opacity md:p-4 ${
          isPending ? "pointer-events-none opacity-50" : "opacity-100"
        }`}
      >
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search titles..."
              className="bg-background pl-9"
              value={filters.q ?? ""}
              onChange={(e) => setFilters({ q: e.target.value, page: 1 })}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setIsOpen((current) => !current)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 ? (
              <Badge variant="secondary" className="rounded-full px-2">
                {activeFiltersCount}
              </Badge>
            ) : null}
          </Button>
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-3">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Location..."
                  className="bg-background pl-9"
                  value={filters.location ?? ""}
                  onChange={(e) =>
                    setFilters({ location: e.target.value, page: 1 })
                  }
                />
              </div>

              <Select
                value={filters.experience?.[0] || "all"}
                onValueChange={(val) =>
                  setFilters({
                    experience: val === "all" ? [] : [val],
                    page: 1,
                  })
                }
              >
                <SelectTrigger className="w-full bg-background">
                  <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Entry level">Entry Level</SelectItem>
                  <SelectItem value="Associate">Associate</SelectItem>
                  <SelectItem value="Mid-Senior level">Mid-Senior</SelectItem>
                  <SelectItem value="Director">Director</SelectItem>
                  <SelectItem value="Executive">Executive</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Min Pay"
                  className="bg-background pl-9"
                  value={filters.minSalary || ""}
                  onChange={(e) =>
                    setFilters({
                      minSalary: parseInt(e.target.value, 10) || 0,
                      page: 1,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t pt-3 md:flex-row md:items-center md:justify-between">
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="justify-start gap-2"
                disabled={activeFiltersCount === 0}
              >
                <RotateCcw className="h-4 w-4" />
                Reset filters
              </Button>
              {activeFiltersCount > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {filters.q ? (
                    <Badge variant="secondary" className="gap-1">
                      {filters.q}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setFilters({ q: "", page: 1 })}
                      />
                    </Badge>
                  ) : null}
                  {filters.location ? (
                    <Badge variant="secondary" className="gap-1">
                      {filters.location}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setFilters({ location: "", page: 1 })}
                      />
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="flex h-5 items-center px-1">
        {isPending ? (
          <div className="animate-in fade-in slide-in-from-top-1 flex items-center gap-2 text-xs font-medium text-primary">
            <Loader2 className="h-3 w-3 animate-spin" />
            Filtering postings...
          </div>
        ) : null}
      </div>
    </div>
  );
}

