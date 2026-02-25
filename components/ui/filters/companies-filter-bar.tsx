"use client";

import React, { useTransition, useState, useEffect } from "react";
import { useQueryStates } from "nuqs";
import { companiesSearchParamsSchema } from "@/lib/companies-search-params";
import {
  Loader2,
  Search,
  MapPin,
  DollarSign,
  X,
  SlidersHorizontal,
  RotateCcw,
  Building2,
  Users,
  ArrowUpDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";

const COMPANY_SIZE_OPTIONS = [
  { value: "1-10", label: "1–10" },
  { value: "11-50", label: "11–50" },
  { value: "51-200", label: "51–200" },
  { value: "201-500", label: "201–500" },
  { value: "501-1000", label: "501–1K" },
  { value: "1001-5000", label: "1K–5K" },
  { value: "5001-10000", label: "5K–10K" },
  { value: "10001+", label: "10K+" },
];

export function CompaniesFilterBar() {
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useQueryStates(companiesSearchParamsSchema, {
    startTransition,
    shallow: false,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.q);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.q) {
        startTransition(() => {
          setFilters({ q: searchInput, page: 1 });
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters.q, setFilters]);

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filters.q) count++;
    if (filters.location) count++;
    if (filters.companySize.length > 0) count++;
    if (filters.minSalary > 0) count++;
    if (filters.minPostings > 0) count++;
    if (filters.sort !== "postings") count++;
    return count;
  }, [filters]);

  const handleReset = () => {
    startTransition(() => {
      setFilters({
        q: "",
        location: "",
        companySize: [],
        minSalary: 0,
        minPostings: 0,
        sort: "postings",
        page: 1,
      });
      setSearchInput("");
    });
  };

  const toggleSize = (size: string) => {
    const current = filters.companySize;
    const updated = current.includes(size)
      ? current.filter((s) => s !== size)
      : [...current, size];
    startTransition(() => {
      setFilters({ companySize: updated, page: 1 });
    });
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 md:p-6">
        {/* Top row: Search + Location + Actions */}
        <div
          className={`flex flex-col md:flex-row gap-3 transition-opacity ${
            isPending ? "opacity-50 pointer-events-none" : "opacity-100"
          }`}
        >
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              className="pl-9 pr-9 bg-background"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  startTransition(() => {
                    setFilters({ q: "", page: 1 });
                  });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Location */}
          <div className="relative flex-1 md:max-w-xs">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by country..."
              className="pl-9 bg-background"
              value={filters.location ?? ""}
              onChange={(e) =>
                startTransition(() => {
                  setFilters({ location: e.target.value, page: 1 });
                })
              }
            />
          </div>

          {/* Sort */}
          <Select
            value={filters.sort}
            onValueChange={(val) =>
              startTransition(() => {
                setFilters({ sort: val, page: 1 });
              })
            }
          >
            <SelectTrigger className="w-full md:w-44 bg-background">
              <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="postings">Most Job Postings</SelectItem>
              <SelectItem value="salary">Highest Median Salary</SelectItem>
              <SelectItem value="name">Company Name</SelectItem>
              <SelectItem value="size">Largest Companies</SelectItem>
            </SelectContent>
          </Select>

          {/* Filters Toggle */}
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

        {/* Expandable Filters */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 mt-4 border-t">
              {/* Company Size */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Company Size
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COMPANY_SIZE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={filters.companySize.includes(opt.value)}
                        onCheckedChange={() => toggleSize(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Min Salary */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Min Median Salary
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="e.g. 60000"
                    className="pl-9 bg-background"
                    value={filters.minSalary || ""}
                    onChange={(e) =>
                      startTransition(() => {
                        setFilters({
                          minSalary: parseInt(e.target.value) || 0,
                          page: 1,
                        });
                      })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Filter companies with median salary above this threshold
                </p>
              </div>

              {/* Min Postings */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Min Job Postings
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="e.g. 5"
                    className="pl-9 bg-background"
                    value={filters.minPostings || ""}
                    onChange={(e) =>
                      startTransition(() => {
                        setFilters({
                          minPostings: parseInt(e.target.value) || 0,
                          page: 1,
                        });
                      })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Only show companies with at least this many postings
                </p>
              </div>
            </div>

            {/* Reset Row */}
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
              <div className="text-sm text-muted-foreground">
                {activeFiltersCount > 0 && (
                  <span>{activeFiltersCount} active filter(s)</span>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Loading */}
        <div className="h-5 flex items-center px-2">
          {isPending && (
            <div className="flex items-center gap-2 text-xs font-medium text-primary animate-in fade-in slide-in-from-top-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Filtering companies...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
