"use client";

import { useEffect, useState } from "react";
import { Building2, TrendingUp, DollarSign, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";

interface HeroStats {
  totalCompanies: number;
  avgPostings: number;
  highestPayingCompany: string;
  highestPayingSalary: number;
  mostActiveIndustry: string;
  mostActiveIndustryCount: number;
}

interface HeroStatsDashboardProps {
  stats: HeroStats;
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  subtitle?: string;
  gradientFrom: string;
  gradientTo: string;
}

function useCountUp(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

function StatCard({
  icon,
  value,
  label,
  subtitle,
  gradientFrom,
  gradientTo,
}: StatCardProps) {
  const animatedValue = useCountUp(value);

  return (
    <Card className="relative overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${gradientFrom} ${gradientTo}`}
          >
            <div className="text-white">{icon}</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              {animatedValue.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {label}
            </div>
            {subtitle && (
              <div className="text-xs text-slate-500 dark:text-slate-500 truncate max-w-[200px]">
                {subtitle}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gradient overlay on hover */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${gradientTo} opacity-0 hover:opacity-5 transition-opacity duration-300 pointer-events-none`}
      />
    </Card>
  );
}

export function HeroStatsDashboard({ stats }: HeroStatsDashboardProps) {
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20 p-6 border border-slate-200 dark:border-slate-800">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.05))] rounded-2xl" />

      <div className="relative">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Market Overview
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Real-time insights across the job market
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Building2 className="w-6 h-6" />}
            value={stats.totalCompanies}
            label="Companies Tracked"
            gradientFrom="from-blue-500"
            gradientTo="to-blue-600"
          />

          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            value={stats.avgPostings}
            label="Avg Postings"
            subtitle="per company"
            gradientFrom="from-emerald-500"
            gradientTo="to-emerald-600"
          />

          <StatCard
            icon={<DollarSign className="w-6 h-6" />}
            value={stats.highestPayingSalary}
            label="Highest Median Salary"
            subtitle={stats.highestPayingCompany}
            gradientFrom="from-amber-500"
            gradientTo="to-amber-600"
          />

          <StatCard
            icon={<Briefcase className="w-6 h-6" />}
            value={stats.mostActiveIndustryCount}
            label="Top Industry"
            subtitle={stats.mostActiveIndustry}
            gradientFrom="from-purple-500"
            gradientTo="to-purple-600"
          />
        </div>
      </div>
    </div>
  );
}
