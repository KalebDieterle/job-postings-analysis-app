"use client";

import { useState } from "react";
import { X, GitCompare, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface CompanyData {
  company_id: string;
  name: string;
  location: string;
  company_size: string | null;
  posting_count: number;
  avg_salary: number;
  industry_count: number;
}

interface ComparisonPanelProps {
  selectedCompanies: string[];
  companiesData: CompanyData[];
  onClearAll: () => void;
}

const COMPANY_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ef4444", // red
];

function normalizeValue(value: number, max: number): number {
  return max > 0 ? (value / max) * 100 : 0;
}

export function ComparisonPanel({
  selectedCompanies,
  companiesData,
  onClearAll,
}: ComparisonPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Prepare radar chart data
  const maxValues = {
    posting_count: Math.max(...companiesData.map((c) => c.posting_count), 1),
    avg_salary: Math.max(...companiesData.map((c) => c.avg_salary), 1),
    industry_count: Math.max(...companiesData.map((c) => c.industry_count), 1),
  };

  const radarData = [
    {
      metric: "Postings",
      ...Object.fromEntries(
        companiesData.map((c, i) => [
          `company${i}`,
          normalizeValue(c.posting_count, maxValues.posting_count),
        ]),
      ),
    },
    {
      metric: "Avg Salary",
      ...Object.fromEntries(
        companiesData.map((c, i) => [
          `company${i}`,
          normalizeValue(c.avg_salary, maxValues.avg_salary),
        ]),
      ),
    },
    {
      metric: "Industries",
      ...Object.fromEntries(
        companiesData.map((c, i) => [
          `company${i}`,
          normalizeValue(c.industry_count, maxValues.industry_count),
        ]),
      ),
    },
  ];

  const hasSelections = selectedCompanies.length > 0;

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          disabled={selectedCompanies.length < 2}
          className={`
            relative rounded-full shadow-lg h-12 sm:h-14 px-4 sm:px-6
            ${hasSelections ? "animate-pulse" : ""}
            bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700
            text-white border-0
            disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none
          `}
        >
          <GitCompare className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
          <span className="font-medium text-sm sm:text-base">
            <span className="hidden sm:inline">Compare Companies </span>
            <span className="sm:hidden">Compare </span>(
            {selectedCompanies.length})
          </span>

          {selectedCompanies.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {selectedCompanies.length}
            </span>
          )}
        </Button>
      </div>

      {/* Comparison Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-full sm:max-w-6xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <DialogTitle className="text-xl sm:text-2xl font-bold">
                Company Comparison
              </DialogTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                className="ml-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>
          </DialogHeader>

          {companiesData.length < 2 ? (
            <div className="py-12 text-center text-slate-500">
              Select at least 2 companies to compare
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              {/* Radar Chart */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Performance Comparison
                </h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid className="stroke-slate-200 dark:stroke-slate-800" />
                      <PolarAngleAxis
                        dataKey="metric"
                        className="text-xs"
                        tick={{ fill: "currentColor" }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        className="text-xs"
                        tick={{ fill: "currentColor" }}
                      />
                      {companiesData.map((company, index) => (
                        <Radar
                          key={company.company_id}
                          name={company.name}
                          dataKey={`company${index}`}
                          stroke={COMPANY_COLORS[index]}
                          fill={COMPANY_COLORS[index]}
                          fillOpacity={0.3}
                        />
                      ))}
                      <Legend />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-white dark:bg-slate-950 p-3 shadow-lg">
                                <p className="font-semibold text-sm mb-2">
                                  {payload[0].payload.metric}
                                </p>
                                {payload.map((entry: any, index: number) => (
                                  <p
                                    key={index}
                                    className="text-xs"
                                    style={{ color: entry.color }}
                                  >
                                    {entry.name}: {entry.value.toFixed(1)}%
                                  </p>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">
                        Metric
                      </th>
                      {companiesData.map((company, index) => (
                        <th
                          key={company.company_id}
                          className="px-4 py-3 text-left text-sm font-semibold"
                          style={{ color: COMPANY_COLORS[index] }}
                        >
                          {company.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                        Location
                      </td>
                      {companiesData.map((company) => (
                        <td
                          key={company.company_id}
                          className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400"
                        >
                          {company.location || "N/A"}
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                        Company Size
                      </td>
                      {companiesData.map((company) => (
                        <td
                          key={company.company_id}
                          className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400"
                        >
                          {company.company_size || "N/A"}
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                        Total Postings
                      </td>
                      {companiesData.map((company) => (
                        <td
                          key={company.company_id}
                          className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white"
                        >
                          {company.posting_count.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                        Avg Salary
                      </td>
                      {companiesData.map((company) => (
                        <td
                          key={company.company_id}
                          className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400"
                        >
                          ${company.avg_salary.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                        Industry Diversity
                      </td>
                      {companiesData.map((company) => (
                        <td
                          key={company.company_id}
                          className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400"
                        >
                          {company.industry_count}{" "}
                          {company.industry_count === 1
                            ? "industry"
                            : "industries"}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
