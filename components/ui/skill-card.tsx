import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

export function SkillCard({
  name,
  count,
  avgSalary,
}: {
  name: string;
  count: number;
  avgSalary: number;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg capitalize">{name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Demand:</span>
          <span className="font-medium">{count.toLocaleString()} jobs</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-muted-foreground">Avg. Base:</span>
          <span className="font-medium">${Math.round(avgSalary / 1000)}k</span>
        </div>
      </CardContent>
    </Card>
  );
}
