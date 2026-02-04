"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface SkillData {
  skill_name: string;
  skill_abr: string;
  count: number;
}

interface SkillsFrequencyChartProps {
  data: SkillData[];
}

export function SkillsFrequencyChart({ data }: SkillsFrequencyChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No skill data available</p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map((s) => s.count));
  const minCount = Math.min(...data.map((s) => s.count));
  const range = maxCount - minCount;

  const getSize = (count: number) => {
    const normalized = range > 0 ? (count - minCount) / range : 0.5;
    return 0.8 + normalized * 1.5; // Range from 0.8rem to 2.3rem
  };

  const getOpacity = (count: number) => {
    const normalized = range > 0 ? (count - minCount) / range : 0.5;
    return 0.5 + normalized * 0.5; // Range from 0.5 to 1
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Skills Across Roles</CardTitle>
        <p className="text-sm text-muted-foreground">
          Click any skill to explore details
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 justify-center items-center min-h-[300px]">
          {data.map((skill) => (
            <Link
              key={skill.skill_abr}
              href={`/skills/${encodeURIComponent(skill.skill_name.toLowerCase())}`}
              className="group"
            >
              <div
                className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium transition-all hover:scale-110 hover:shadow-lg cursor-pointer"
                style={{
                  fontSize: `${getSize(skill.count)}rem`,
                  opacity: getOpacity(skill.count),
                }}
                title={`${skill.skill_name}: ${skill.count.toLocaleString()} postings`}
              >
                {skill.skill_name}
                <span className="text-xs ml-2 opacity-80">
                  {skill.count.toLocaleString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
