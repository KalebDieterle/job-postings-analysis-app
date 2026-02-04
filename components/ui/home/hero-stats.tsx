"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, DollarSign, Building2, Code } from "lucide-react";
import { useEffect, useState } from "react";

interface HeroStatsProps {
  data: {
    totalJobs: number;
    avgSalary: number;
    totalCompanies: number;
    totalSkills: number;
    monthlyGrowth: number;
  };
}

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        setIsLoading(false);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  if (isLoading && count === 0) {
    return <Skeleton className="h-10 w-32 bg-white/30" />;
  }

  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
}

function StatCard({ 
  icon: Icon, 
  title, 
  value, 
  change, 
  gradient,
  prefix = "",
  suffix = ""
}: { 
  icon: any; 
  title: string; 
  value: number; 
  change: string; 
  gradient: string;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <Card className={`relative overflow-hidden ${gradient} border-none`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-white/80">{title}</p>
            <p className="text-4xl font-bold text-white">
              <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
            </p>
            <p className="text-xs text-white/70 flex items-center gap-1">
              <span className="text-green-300">↑</span>
              {change}
            </p>
          </div>
          <div className="rounded-full bg-white/20 p-4">
            <Icon className="h-8 w-8 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function HeroStats({ data }: HeroStatsProps) {
  const { totalJobs, avgSalary, totalCompanies, totalSkills, monthlyGrowth } = data;
  
  return (
    <div className="w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4 mb-8">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Job Market Overview</h2>
          <p className="text-muted-foreground">Real-time insights from the latest job market data</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          <StatCard
            icon={Briefcase}
            title="Total Job Postings"
            value={totalJobs}
            change={`${monthlyGrowth > 0 ? '+' : ''}${monthlyGrowth}% this month`}
            gradient="bg-gradient-to-br from-blue-500 to-blue-700"
          />
          <StatCard
            icon={DollarSign}
            title="Average Salary"
            value={avgSalary}
            change="+5% vs last quarter"
            gradient="bg-gradient-to-br from-green-500 to-green-700"
            prefix="$"
          />
          <StatCard
            icon={Building2}
            title="Total Companies"
            value={totalCompanies}
            change="+8% this month"
            gradient="bg-gradient-to-br from-purple-500 to-purple-700"
          />
          <StatCard
            icon={Code}
            title="Unique Skills"
            value={totalSkills}
            change="Growing demand"
            gradient="bg-gradient-to-br from-orange-500 to-orange-700"
          />
        </div>
      </div>
    </div>
  );
}
