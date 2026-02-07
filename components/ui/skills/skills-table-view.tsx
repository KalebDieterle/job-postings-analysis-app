"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GitCompare,
  Download,
} from "lucide-react";
import Link from "next/link";
import { categorizeSkill } from "@/lib/skill-helpers";
import { cn } from "@/lib/utils";

interface SkillTableData {
  name: string;
  count: number;
  avg_salary: number;
  growth?: number;
  topCompanies?: string[];
}

interface SkillsTableViewProps {
  data: SkillTableData[];
}

type SortField = "name" | "demand" | "salary" | "growth";
type SortDirection = "asc" | "desc";

export function SkillsTableView({ data }: SkillsTableViewProps) {
  const [sortField, setSortField] = React.useState<SortField>("demand");
  const [sortDirection, setSortDirection] =
    React.useState<SortDirection>("desc");
  const [selectedSkills, setSelectedSkills] = React.useState<Set<string>>(
    new Set(),
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedData = React.useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "demand":
          aVal = a.count;
          bVal = b.count;
          break;
        case "salary":
          aVal = a.avg_salary;
          bVal = b.avg_salary;
          break;
        case "growth":
          aVal = a.growth || 0;
          bVal = b.growth || 0;
          break;
        default:
          return 0;
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return sorted;
  }, [data, sortField, sortDirection]);

  const toggleSkillSelection = (skillName: string) => {
    setSelectedSkills((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(skillName)) {
        newSet.delete(skillName);
      } else {
        if (newSet.size < 5) {
          newSet.add(skillName);
        }
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSkills.size === sortedData.length) {
      setSelectedSkills(new Set());
    } else {
      setSelectedSkills(new Set(sortedData.slice(0, 5).map((s) => s.name)));
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Skill Name",
      "Category",
      "Demand",
      "Avg Salary",
      "Growth",
      "Top Companies",
    ];
    const rows = sortedData.map((skill) => [
      skill.name,
      categorizeSkill(skill.name),
      skill.count,
      skill.avg_salary,
      skill.growth || "N/A",
      skill.topCompanies?.join("; ") || "N/A",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skills-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Table Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedSkills.size > 0 && (
            <>
              <Button variant="default" size="sm" className="gap-2">
                <GitCompare className="h-4 w-4" />
                Compare Selected ({selectedSkills.size})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSkills(new Set())}
              >
                Clear
              </Button>
            </>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={exportToCSV}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-slate-50 dark:bg-slate-900">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedSkills.size === Math.min(5, sortedData.length)
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center font-semibold hover:text-slate-900 dark:hover:text-white"
                  >
                    Skill Name
                    <SortIcon field="name" />
                  </button>
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("demand")}
                    className="flex items-center font-semibold hover:text-slate-900 dark:hover:text-white"
                  >
                    Demand
                    <SortIcon field="demand" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("salary")}
                    className="flex items-center font-semibold hover:text-slate-900 dark:hover:text-white"
                  >
                    Avg Salary
                    <SortIcon field="salary" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("growth")}
                    className="flex items-center font-semibold hover:text-slate-900 dark:hover:text-white"
                  >
                    Growth
                    <SortIcon field="growth" />
                  </button>
                </TableHead>
                <TableHead>Top Companies</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((skill) => (
                <TableRow
                  key={skill.name}
                  className={cn(
                    "hover:bg-slate-50 dark:hover:bg-slate-900/50",
                    selectedSkills.has(skill.name) &&
                      "bg-blue-50 dark:bg-blue-950/20",
                  )}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedSkills.has(skill.name)}
                      onCheckedChange={() => toggleSkillSelection(skill.name)}
                      disabled={
                        !selectedSkills.has(skill.name) &&
                        selectedSkills.size >= 5
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/skills/${encodeURIComponent(skill.name.toLowerCase())}`}
                      className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                    >
                      {skill.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {categorizeSkill(skill.name)}
                    </Badge>
                  </TableCell>
                  <TableCell>{skill.count.toLocaleString()}</TableCell>
                  <TableCell>
                    {skill.avg_salary > 0
                      ? `$${(skill.avg_salary / 1000).toFixed(0)}k`
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {skill.growth ? (
                      <span
                        className={cn(
                          "font-medium",
                          skill.growth > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400",
                        )}
                      >
                        {skill.growth > 0 ? "+" : ""}
                        {skill.growth.toFixed(1)}%
                      </span>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {skill.topCompanies?.slice(0, 3).map((company, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {company}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedSkills.size > 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
          Select up to 5 skills to compare. {5 - selectedSkills.size} remaining.
        </p>
      )}
    </div>
  );
}
