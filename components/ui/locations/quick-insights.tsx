"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Award, Target } from "lucide-react";
import { motion } from "framer-motion";

interface QuickInsightsProps {
  highestPayingLocation: {
    name: string;
    salary: number;
  };
  jobHotspot: {
    name: string;
    jobCount: number;
    trend: "up" | "down" | "stable";
  };
  marketAverage: {
    avgSalary: number;
    comparison: number; // percentage difference from top city
  };
}

export function QuickInsights({
  highestPayingLocation,
  jobHotspot,
  marketAverage,
}: QuickInsightsProps) {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      {/* Highest Paying Location */}
      <motion.div variants={itemVariants}>
        <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 border-transparent hover:border-green-500/20 backdrop-blur-sm bg-gradient-to-br from-background via-background to-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                <Award className="w-6 h-6 text-green-500" />
              </div>
              <div className="h-12 flex items-center">
                <svg width="80" height="40" className="opacity-20">
                  <path
                    d="M 0,30 Q 20,25 40,20 T 80,10"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    className="text-green-500"
                  />
                </svg>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Highest Paying
              </p>
              <p className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                ${(highestPayingLocation.salary / 1000).toFixed(0)}k
              </p>
              <p className="text-sm font-medium text-foreground/80 truncate">
                {highestPayingLocation.name}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Job Hotspot */}
      <motion.div variants={itemVariants}>
        <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 border-transparent hover:border-blue-500/20 backdrop-blur-sm bg-gradient-to-br from-background via-background to-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex items-center gap-1">
                {jobHotspot.trend === "up" && (
                  <span className="text-green-500 text-xl">↑</span>
                )}
                {jobHotspot.trend === "down" && (
                  <span className="text-red-500 text-xl">↓</span>
                )}
                {jobHotspot.trend === "stable" && (
                  <span className="text-amber-500 text-xl">→</span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Top Job Market
              </p>
              <p className="text-3xl font-black bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                {jobHotspot.jobCount.toLocaleString()}
              </p>
              <p className="text-sm font-medium text-foreground/80 truncate">
                {jobHotspot.name}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Market Average */}
      <motion.div variants={itemVariants}>
        <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 border-transparent hover:border-purple-500/20 backdrop-blur-sm bg-gradient-to-br from-background via-background to-purple-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded ${
                    marketAverage.comparison > 0
                      ? "bg-green-500/10 text-green-500"
                      : "bg-red-500/10 text-red-500"
                  }`}
                >
                  {marketAverage.comparison > 0 ? "+" : ""}
                  {marketAverage.comparison.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Market Average
              </p>
              <p className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                ${(marketAverage.avgSalary / 1000).toFixed(0)}k
              </p>
              <p className="text-sm font-medium text-foreground/80">
                vs. top market
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
