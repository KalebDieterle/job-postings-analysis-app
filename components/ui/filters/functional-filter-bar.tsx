"use client";

import * as React from "react";
import { useQueryStates } from "nuqs";
import { Search, X, SlidersHorizontal, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CategorySelect } from "./category-select";
import { RangeSlider } from "./range-slider";
import { ExperienceCheckboxGroup } from "./experience-checkbox-group";
import { SortDropdown } from "./sort-dropdown";
import { skillsSearchParamsParser } from "@/lib/skills-search-params";
import { useTransition } from "react";

export function FunctionalFilterBar() {
  const [searchParams, setSearchParams] = useQueryStates(
    skillsSearchParamsParser,
    {
      shallow: false,
    },
  );
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState(searchParams.q);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchParams.q) {
        startTransition(() => {
          setSearchParams({ q: searchInput, page: 1 });
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, searchParams.q, setSearchParams]);

  // Count active filters
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (searchParams.q) count++;
    if (searchParams.category.length > 0) count++;
    if (searchParams.demandMin > 0 || searchParams.demandMax < 10000) count++;
    if (searchParams.salaryMin > 40000 || searchParams.salaryMax < 200000)
      count++;
    if (searchParams.experience.length > 0) count++;
    if (searchParams.sort !== "demand") count++;
    return count;
  }, [searchParams]);

  const handleReset = () => {
    startTransition(() => {
      setSearchParams({
        q: "",
        category: [],
        demandMin: 0,
        demandMax: 10000,
        salaryMin: 40000,
        salaryMax: 200000,
        experience: [],
        sort: "demand",
        page: 1,
      });
      setSearchInput("");
    });
  };

  const formatSalary = (value: number) => {
    return `$${(value / 1000).toFixed(0)}k`;
  };

  const formatDemand = (value: number) => {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString();
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        {/* Search Bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search skills (e.g., React, Python, AWS)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  startTransition(() => {
                    setSearchParams({ q: "", page: 1 });
                  });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 rounded-full px-2">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Collapsible Filters */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t">
              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Categories
                </label>
                <CategorySelect
                  value={searchParams.category}
                  onChange={(category) =>
                    startTransition(() => {
                      setSearchParams({ category, page: 1 });
                    })
                  }
                />
              </div>

              {/* Sort Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Sort By
                </label>
                <SortDropdown
                  value={searchParams.sort}
                  onChange={(sort) =>
                    startTransition(() => {
                      setSearchParams({ sort, page: 1 });
                    })
                  }
                />
              </div>

              {/* Experience Level */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Experience Level
                </label>
                <ExperienceCheckboxGroup
                  value={searchParams.experience}
                  onChange={(experience) =>
                    startTransition(() => {
                      setSearchParams({ experience, page: 1 });
                    })
                  }
                />
              </div>

              {/* Demand Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Demand Level (Job Count)
                </label>
                <RangeSlider
                  min={0}
                  max={10000}
                  step={100}
                  value={[searchParams.demandMin, searchParams.demandMax]}
                  onChange={([demandMin, demandMax]) =>
                    startTransition(() => {
                      setSearchParams({ demandMin, demandMax, page: 1 });
                    })
                  }
                  formatLabel={formatDemand}
                />
              </div>

              {/* Salary Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Salary Range
                </label>
                <RangeSlider
                  min={40000}
                  max={200000}
                  step={5000}
                  value={[searchParams.salaryMin, searchParams.salaryMax]}
                  onChange={([salaryMin, salaryMax]) =>
                    startTransition(() => {
                      setSearchParams({ salaryMin, salaryMax, page: 1 });
                    })
                  }
                  formatLabel={formatSalary}
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="ghost"
                onClick={handleReset}
                className="gap-2"
                disabled={activeFiltersCount === 0}
              >
                <RotateCcw className="h-4 w-4" />
                Reset All Filters
              </Button>
              <div className="text-sm text-slate-500">
                {activeFiltersCount > 0 && (
                  <span>{activeFiltersCount} active filter(s)</span>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Loading indicator */}
        {isPending && (
          <div className="mt-4 text-center text-sm text-slate-500">
            Applying filters...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
