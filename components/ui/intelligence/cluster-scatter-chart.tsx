"use client";

import { useEffect, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AdjacentRolesList } from "./adjacent-roles-list";

interface ClusterPoint {
  role: string;
  cluster_id: number;
  x: number;
  y: number;
  posting_count: number;
}

interface ClustersData {
  clusters: ClusterPoint[];
  cluster_count: number;
}

const CLUSTER_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#e11d48", "#a855f7", "#22c55e", "#eab308",
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-|-$/g, "");
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ClusterPoint }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as ClusterPoint;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <p className="font-medium">{data.role}</p>
      <p className="text-muted-foreground">
        Cluster {data.cluster_id} &middot; {data.posting_count} postings
      </p>
    </div>
  );
}

export function ClusterScatterChart() {
  const [data, setData] = useState<ClustersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ml/clusters")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load clusters");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Role Clusters</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[450px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job Role Clusters</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-12">
            {error || "ML service unavailable. Make sure the ML service is running."}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by cluster for the legend
  const clusterGroups = new Map<number, number>();
  data.clusters.forEach((p) => {
    clusterGroups.set(p.cluster_id, (clusterGroups.get(p.cluster_id) || 0) + 1);
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Job Role Clusters</CardTitle>
            <span className="text-xs text-muted-foreground">
              {data.clusters.length} roles &middot; {data.cluster_count} clusters
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={450}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <XAxis type="number" dataKey="x" hide />
              <YAxis type="number" dataKey="y" hide />
              <Tooltip content={<CustomTooltip />} />
              <Scatter
                data={data.clusters}
                onClick={(point: ClusterPoint) => {
                  if (point?.role) {
                    setSelectedRole(point.role);
                  }
                }}
                cursor="pointer"
              >
                {data.clusters.map((point, i) => (
                  <Cell
                    key={i}
                    fill={CLUSTER_COLORS[point.cluster_id % CLUSTER_COLORS.length]}
                    opacity={
                      selectedRole
                        ? point.role === selectedRole
                          ? 1
                          : 0.3
                        : 0.8
                    }
                    r={Math.max(5, Math.min(15, Math.sqrt(point.posting_count) * 1.5))}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {Array.from(clusterGroups.entries()).map(([id, count]) => (
              <div key={id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CLUSTER_COLORS[id % CLUSTER_COLORS.length] }}
                />
                Cluster {id} ({count})
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        {selectedRole ? (
          <AdjacentRolesList roleSlug={slugify(selectedRole)} roleName={selectedRole} />
        ) : (
          <Card className="flex items-center justify-center h-full">
            <CardContent className="text-center text-muted-foreground py-16">
              <p className="text-sm">Click a role on the chart to see similar roles</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
