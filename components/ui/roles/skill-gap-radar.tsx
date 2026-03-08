"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SkillGapRadarProps {
  data: { skill: string; count: number }[];
  roleTitle: string;
}

export function SkillGapRadar({ data, roleTitle }: SkillGapRadarProps) {
  const top8 = data.slice(0, 8);
  const maxCount = Math.max(...top8.map((d) => d.count), 1);

  const radarData = top8.map((d) => ({
    skill: d.skill.length > 14 ? d.skill.slice(0, 12) + "…" : d.skill,
    fullSkill: d.skill,
    demand: Math.round((d.count / maxCount) * 100),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Skill Demand Radar</CardTitle>
        <p className="text-xs text-muted-foreground">
          Top skills for {roleTitle} by posting frequency
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              />
              <Radar
                name="Demand"
                dataKey="demand"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip
                formatter={(value, _name, props) => [
                  `${value}% relative demand`,
                  props.payload?.fullSkill ?? "Skill",
                ]}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
