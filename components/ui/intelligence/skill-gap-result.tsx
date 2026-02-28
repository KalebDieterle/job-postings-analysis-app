"use client";

import {
  RadarChart,
  Radar,
  PolarAngleAxis,
  PolarGrid,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface SkillDetail {
  skill: string;
  importance: number;
  status: "matched" | "gap" | "bonus";
}

interface GapResult {
  canonical_role: string;
  match_percentage: number;
  skills: SkillDetail[];
  learning_priority: string[];
}

function MatchGauge({ percentage }: { percentage: number }) {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (percentage / 100) * circumference;
  const color =
    percentage >= 70
      ? "text-emerald-500"
      : percentage >= 40
        ? "text-amber-500"
        : "text-red-500";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" className="-rotate-90">
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          strokeWidth="8"
          className="stroke-muted"
        />
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} stroke-current transition-all duration-700`}
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-2xl font-bold">{Math.round(percentage)}%</span>
        <p className="text-[10px] text-muted-foreground">Match</p>
      </div>
    </div>
  );
}

function SkillRadar({ skills }: { skills: SkillDetail[] }) {
  // Show top 8 skills for radar readability
  const radarData = skills
    .filter((s) => s.status !== "bonus")
    .slice(0, 8)
    .map((s) => ({
      skill: s.skill.length > 12 ? s.skill.slice(0, 12) + "..." : s.skill,
      required: Math.round(s.importance * 100),
      you: s.status === "matched" ? Math.round(s.importance * 100) : 0,
    }));

  if (radarData.length < 3) return null;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
        <PolarGrid strokeDasharray="3 3" />
        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10 }} />
        <Radar
          name="Required"
          dataKey="required"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.15}
        />
        <Radar
          name="You"
          dataKey="you"
          stroke="#10b981"
          fill="#10b981"
          fillOpacity={0.3}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function SkillGapResult({
  result,
  loading,
}: {
  result: GapResult | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-28 w-28 rounded-full mx-auto" />
          <Skeleton className="h-60 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground py-16">
          <p className="text-lg font-medium">No analysis yet</p>
          <p className="text-sm mt-1">
            Select a role and add your skills to see the gap analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  const matched = result.skills.filter((s) => s.status === "matched");
  const gaps = result.skills.filter((s) => s.status === "gap");
  const bonus = result.skills.filter((s) => s.status === "bonus");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{result.canonical_role}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <MatchGauge percentage={result.match_percentage} />
        </div>

        <SkillRadar skills={result.skills} />

        {matched.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-emerald-600">
              Matched Skills ({matched.length})
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {matched.map((s) => (
                <Badge key={s.skill} variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-400">
                  {s.skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {gaps.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-amber-600">
              Skills to Learn ({gaps.length})
            </h4>
            <div className="space-y-1.5">
              {gaps.slice(0, 10).map((s) => (
                <div key={s.skill} className="flex items-center gap-2">
                  <div className="flex-1 text-sm">{s.skill}</div>
                  <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${s.importance * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {bonus.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-sky-600">
              Bonus Skills ({bonus.length})
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {bonus.map((s) => (
                <Badge key={s.skill} variant="outline" className="border-sky-300 text-sky-700 dark:text-sky-400">
                  {s.skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
