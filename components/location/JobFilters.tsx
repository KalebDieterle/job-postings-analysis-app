"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface JobFiltersProps {
  onFilterChange?: (filters: {
    search: string;
    workMode: string;
    experience: string;
    sortBy: string;
  }) => void;
  initialValues?: {
    search: string;
    workMode: string;
    experience: string;
    sortBy: string;
  };
}

export function JobFilters({ onFilterChange, initialValues }: JobFiltersProps) {
  const [search, setSearch] = useState(initialValues?.search || "");
  const [workMode, setWorkMode] = useState(initialValues?.workMode || "all");
  const [experience, setExperience] = useState(initialValues?.experience || "all");
  const [sortBy, setSortBy] = useState(initialValues?.sortBy || "date");
  const [showFilters, setShowFilters] = useState(false);

  const activeFiltersCount =
    (workMode !== "all" ? 1 : 0) +
    (experience !== "all" ? 1 : 0) +
    (search.length > 0 ? 1 : 0);

  // Auto-apply filters with debouncing for search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange?.({ search, workMode, experience, sortBy });
    }, 300); // 300ms debounce for search

    return () => clearTimeout(timer);
  }, [search, workMode, experience, sortBy, onFilterChange]);

  const handleClearFilters = () => {
    setSearch("");
    setWorkMode("all");
    setExperience("all");
    setSortBy("date");
    onFilterChange?.({
      search: "",
      workMode: "all",
      experience: "all",
      sortBy: "date",
    });
  };

  const handleApplyFilters = () => {
    onFilterChange?.({ search, workMode, experience, sortBy });
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search job titles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Work Mode
                </label>
                <Select value={workMode} onValueChange={setWorkMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Experience Level
                </label>
                <Select value={experience} onValueChange={setExperience}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior Level</SelectItem>
                    <SelectItem value="lead">Lead/Principal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Sort By
                </label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Most Recent</SelectItem>
                    <SelectItem value="salary">Highest Salary</SelectItem>
                    <SelectItem value="relevance">Most Relevant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="gap-1"
              >
                <X className="w-4 h-4" />
                Clear All
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {search && (
            <Badge variant="secondary" className="gap-1">
              Search: {search}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => setSearch("")}
              />
            </Badge>
          )}
          {workMode !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {workMode}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => setWorkMode("all")}
              />
            </Badge>
          )}
          {experience !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {experience}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => setExperience("all")}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
