"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdjacentRole {
  role: string;
  similarity: number;
  cluster_id: number;
}

interface AdjacentData {
  query_role: string;
  cluster_id: number;
  adjacent_roles: AdjacentRole[];
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function AdjacentRolesList({
  roleSlug,
  roleName,
}: {
  roleSlug: string;
  roleName: string;
}) {
  const [data, setData] = useState<AdjacentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ml/clusters/adjacent/${encodeURIComponent(roleSlug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [roleSlug]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Similar to {roleName}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.adjacent_roles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No adjacent roles found
          </p>
        ) : (
          <div className="space-y-2">
            {data.adjacent_roles.map((role) => (
              <Link
                key={role.role}
                href={`/roles/${slugify(role.role)}`}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <span className="font-medium">{role.role}</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(role.similarity * 100)}%
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
