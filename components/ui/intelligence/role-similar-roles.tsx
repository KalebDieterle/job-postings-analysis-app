"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AdjacentRole {
  role: string;
  similarity: number;
  cluster_id: number;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function RoleSimilarRoles({ roleSlug }: { roleSlug: string }) {
  const [roles, setRoles] = useState<AdjacentRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadInsight = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/ml/clusters/adjacent/${encodeURIComponent(roleSlug)}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || payload?.error || "Unable to load similar roles");
      }

      const data = (await res.json()) as { adjacent_roles?: AdjacentRole[] };
      setRoles(Array.isArray(data.adjacent_roles) ? data.adjacent_roles.slice(0, 6) : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load similar roles");
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  if (roles.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Network className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-semibold">Similar Roles</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Load nearest roles on demand to avoid background ML calls.
        </p>
        {error ? <p className="text-sm text-destructive mb-3">{error}</p> : null}
        <Button size="sm" onClick={loadInsight} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            "Load ML Insight"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Network className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-semibold">Similar Roles</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <Link key={role.role} href={`/roles/${slugify(role.role)}`}>
            <Badge variant="outline" className="cursor-pointer hover:bg-accent transition-colors">
              {role.role}
              <span className="ml-1 text-muted-foreground">
                {Math.round(role.similarity * 100)}%
              </span>
            </Badge>
          </Link>
        ))}
      </div>
      <div className="mt-3">
        <Button size="sm" variant="outline" onClick={loadInsight} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            "Refresh Insight"
          )}
        </Button>
      </div>
    </div>
  );
}
