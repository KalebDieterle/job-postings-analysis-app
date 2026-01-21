"use client";

import React, { useTransition } from "react";
import { useQueryStates } from "nuqs";
import { searchParamsSchema } from "@/lib/search-params";
import { 
  Loader2, 
  Search, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  X 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FilterBar() {
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useQueryStates(searchParamsSchema, {
    startTransition,
    shallow: false, // Required to trigger server-side re-renders
  });

  // Updated check to include the new search query
  const hasFilters = 
    filters.q !== "" || 
    filters.location !== "" || 
    filters.experience.length > 0 || 
    filters.minSalary > 0;

  const clearFilters = () => {
    setFilters({
      q: "",
      location: "",
      experience: [],
      minSalary: 0,
    });
  };

  return (
    <div className="w-full space-y-2">
      <div 
        className={`flex flex-col md:flex-row gap-4 p-4 bg-card border rounded-xl shadow-sm transition-opacity ${
          isPending ? "opacity-50 pointer-events-none" : "opacity-100"
        }`}
      >
        {/* 1. Global Search (Job Title) - Use this for "Sales", "Engineer", etc. */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search titles..."
            className="pl-9 bg-background"
            value={filters.q ?? ""}
            onChange={(e) => setFilters({ q: e.target.value })}
          />
        </div>

        {/* 2. Location Input - Use this for cities/states */}
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Location..."
            className="pl-9 bg-background"
            value={filters.location ?? ""}
            onChange={(e) => setFilters({ location: e.target.value })}
          />
        </div>

        {/* 3. Experience Level Select */}
        <Select
          value={filters.experience?.[0] || "all"}
          onValueChange={(val) => 
            setFilters({ experience: val === "all" ? [] : [val] })
          }
        >
          <SelectTrigger className="w-full md:w-[180px] bg-background">
            <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
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

        {/* 4. Min Salary Input */}
        <div className="relative w-full md:w-[150px]">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            placeholder="Min Pay"
            className="pl-9 bg-background"
            value={filters.minSalary || ""}
            onChange={(e) => 
              setFilters({ minSalary: parseInt(e.target.value) || 0 })
            }
          />
        </div>

        {/* 5. Clear Button */}
        {hasFilters && (
          <Button 
            variant="ghost" 
            onClick={clearFilters} 
            className="h-10 px-3 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Loading Indicator */}
      <div className="h-5 flex items-center px-2">
        {isPending && (
          <div className="flex items-center gap-2 text-xs font-medium text-primary animate-in fade-in slide-in-from-top-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Filtering 124k postings...
          </div>
        )}
      </div>
    </div>
  );
}