"use client";

import React, { useTransition, useState, useEffect } from "react";
import { useQueryStates } from "nuqs";
import { locationsSearchParamsSchema } from "@/lib/locations-search-params";
import {
  Loader2,
  Search,
  MapPin,
  DollarSign,
  X,
  SlidersHorizontal,
  RotateCcw,
  Briefcase,
  ArrowUpDown,
  Globe,
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
import { Card, CardContent } from "@/components/ui/card";

// Common US states for the dropdown
const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
];

export function LocationsFilterBar() {
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useQueryStates(locationsSearchParamsSchema, {
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
    if (filters.state) count++;
    if (filters.country) count++;
    if (filters.minSalary > 0) count++;
    if (filters.minJobs > 0) count++;
    if (filters.sort !== "jobs") count++;
    return count;
  }, [filters]);

  const handleReset = () => {
    startTransition(() => {
      setFilters({
        q: "",
        state: "",
        country: "",
        minSalary: 0,
        minJobs: 0,
        sort: "jobs",
        page: 1,
      });
      setSearchInput("");
    });
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 md:p-6">
        {/* Top row: Search + State + Sort + Filters */}
        <div
          className={`flex flex-col md:flex-row gap-3 transition-opacity ${
            isPending ? "opacity-50 pointer-events-none" : "opacity-100"
          }`}
        >
          {/* City/Location Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cities, states, or countries..."
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

          {/* State Select */}
          <Select
            value={filters.state || "all"}
            onValueChange={(val) =>
              startTransition(() => {
                setFilters({ state: val === "all" ? "" : val, page: 1 });
              })
            }
          >
            <SelectTrigger className="w-full md:w-36 bg-background">
              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {US_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
              <SelectItem value="jobs">Most Jobs</SelectItem>
              <SelectItem value="salary">Highest Salary</SelectItem>
              <SelectItem value="name">City Name</SelectItem>
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
              {/* Country Filter */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Country
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="e.g. US, GB, CA..."
                    className="pl-9 bg-background"
                    value={filters.country ?? ""}
                    onChange={(e) =>
                      startTransition(() => {
                        setFilters({ country: e.target.value, page: 1 });
                      })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Filter locations by country code
                </p>
              </div>

              {/* Min Salary */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Min Avg Salary
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
                  Only show locations with avg salary above this
                </p>
              </div>

              {/* Min Jobs */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  Min Job Count
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="e.g. 10"
                    className="pl-9 bg-background"
                    value={filters.minJobs || ""}
                    onChange={(e) =>
                      startTransition(() => {
                        setFilters({
                          minJobs: parseInt(e.target.value) || 0,
                          page: 1,
                        });
                      })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Only show locations with at least this many jobs
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
              Filtering locations...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
