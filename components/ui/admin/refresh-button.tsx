"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RefreshButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    // Reset spinner after a short delay — router.refresh() has no callback
    setTimeout(() => setRefreshing(false), 1200);
  }

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh} disabled={refreshing}>
      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
      Refresh
    </Button>
  );
}
