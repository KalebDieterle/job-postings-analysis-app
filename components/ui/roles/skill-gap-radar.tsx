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
              <PolarGrid stroke="#2a4a38" />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fontSize: 11, fill: "#8ab5a0" }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: "#6b9a87" }}
              />
              <Radar
                name="Demand"
                dataKey="demand"
                stroke="#d96030"
                fill="#d96030"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip
                formatter={(value, _name, props) => [
                  `${value}% relative demand`,
                  props.payload?.fullSkill ?? "Skill",
                ]}
                contentStyle={{
                  background: "#0f2219",
                  border: "1px solid #2a4a38",
                  borderRadius: "4px",
                  fontSize: "12px",
                  color: "#c8ddd6",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
