"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CooccurrenceEntry {
  skill_a: string;
  skill_b: string;
  co_count: number;
}

interface CooccurrenceMatrixProps {
  data: CooccurrenceEntry[];
}

function getColor(value: number, maxValue: number): string {
  if (value === 0) return "transparent";
  const ratio = value / maxValue;
  // Blue scale from light to dark
  const alpha = 0.15 + ratio * 0.85;
  return `rgba(59, 130, 246, ${alpha.toFixed(2)})`;
}

function getTextColor(value: number, maxValue: number): string {
  const ratio = value / maxValue;
  return ratio > 0.5 ? "#ffffff" : "#1e3a5f";
}

export function CooccurrenceMatrix({ data }: CooccurrenceMatrixProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    skillA: string;
    skillB: string;
    count: number;
  } | null>(null);

  const { skills, matrixMap, maxCount } = useMemo(() => {
    const skillSet = new Set<string>();
    for (const { skill_a, skill_b } of data) {
      skillSet.add(skill_a);
      skillSet.add(skill_b);
    }
    const skills = Array.from(skillSet).sort();

    const matrixMap = new Map<string, number>();
    for (const { skill_a, skill_b, co_count } of data) {
      matrixMap.set(`${skill_a}:${skill_b}`, co_count);
      matrixMap.set(`${skill_b}:${skill_a}`, co_count);
    }

    const maxCount = Math.max(...data.map((d) => d.co_count), 1);
    return { skills, matrixMap, maxCount };
  }, [data]);

  if (skills.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground text-sm">
          No co-occurrence data available.
        </CardContent>
      </Card>
    );
  }

  const cellSize = Math.max(24, Math.min(40, Math.floor(560 / skills.length)));
  const labelWidth = 80;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Skill Co-occurrence Matrix</CardTitle>
        <p className="text-xs text-muted-foreground">
          How often top skills appear together in the same job posting. Darker = more frequent pairing.
          {hoveredCell && (
            <span className="ml-2 font-semibold text-foreground">
              {hoveredCell.skillA} + {hoveredCell.skillB}:{" "}
              {hoveredCell.count.toLocaleString()} postings
            </span>
          )}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div style={{ display: "inline-block", minWidth: "100%" }}>
            {/* Column labels */}
            <div style={{ display: "flex", marginLeft: labelWidth }}>
              {skills.map((skill) => (
                <div
                  key={skill}
                  style={{
                    width: cellSize,
                    minWidth: cellSize,
                    height: labelWidth,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    paddingBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: Math.max(8, cellSize * 0.3),
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                      transform: "rotate(180deg)",
                      whiteSpace: "nowrap",
                      color: "hsl(var(--muted-foreground))",
                      maxHeight: labelWidth - 8,
                      overflow: "hidden",
                    }}
                  >
                    {skill}
                  </span>
                </div>
              ))}
            </div>

            {/* Rows */}
            {skills.map((rowSkill) => (
              <div key={rowSkill} style={{ display: "flex", alignItems: "center" }}>
                {/* Row label */}
                <div
                  style={{
                    width: labelWidth,
                    minWidth: labelWidth,
                    height: cellSize,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: Math.max(8, cellSize * 0.3),
                      color: "hsl(var(--muted-foreground))",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: labelWidth - 8,
                    }}
                  >
                    {rowSkill}
                  </span>
                </div>

                {/* Cells */}
                {skills.map((colSkill) => {
                  const isDiag = rowSkill === colSkill;
                  const count = isDiag ? 0 : (matrixMap.get(`${rowSkill}:${colSkill}`) ?? 0);
                  const bg = isDiag
                    ? "hsl(var(--muted))"
                    : getColor(count, maxCount);
                  const color = getTextColor(count, maxCount);

                  return (
                    <div
                      key={colSkill}
                      style={{
                        width: cellSize,
                        minWidth: cellSize,
                        height: cellSize,
                        backgroundColor: bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: !isDiag && count > 0 ? "pointer" : "default",
                        border: "1px solid hsl(var(--border))",
                        transition: "opacity 0.1s",
                        opacity:
                          hoveredCell &&
                          (hoveredCell.skillA === rowSkill || hoveredCell.skillB === rowSkill ||
                            hoveredCell.skillA === colSkill || hoveredCell.skillB === colSkill)
                            ? 1
                            : hoveredCell
                              ? 0.4
                              : 1,
                      }}
                      onMouseEnter={() => {
                        if (!isDiag && count > 0) {
                          setHoveredCell({ skillA: rowSkill, skillB: colSkill, count });
                        }
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {!isDiag && count > 0 && cellSize >= 32 && (
                        <span
                          style={{
                            fontSize: Math.max(7, cellSize * 0.25),
                            fontWeight: 600,
                            color,
                            lineHeight: 1,
                          }}
                        >
                          {count >= 1000 ? `${Math.round(count / 100) / 10}k` : count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
