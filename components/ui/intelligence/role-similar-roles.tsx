"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  useEffect(() => {
    fetch(`/api/ml/clusters/adjacent/${encodeURIComponent(roleSlug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.adjacent_roles) {
          setRoles(data.adjacent_roles.slice(0, 6));
        }
      })
      .catch(() => {});
  }, [roleSlug]);

  if (roles.length === 0) return null;

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
    </div>
  );
}
