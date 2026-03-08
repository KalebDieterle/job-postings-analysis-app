"use client";

import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoleExportData {
  title: string;
  count: number;
  medianSalary?: number | null;
}

interface RoleExportActionsProps {
  data: RoleExportData[];
}

export function RoleExportActions({ data }: RoleExportActionsProps) {
  const { toast } = useToast();

  const exportToCSV = () => {
    try {
      const headers = ["Role Title", "Job Count", "Median Salary"];
      const rows = data.map((role) => [
        role.title,
        role.count,
        role.medianSalary ? Math.round(role.medianSalary) : "N/A",
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `roles-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Exported ${data.length} roles to CSV`,
      });
    } catch {
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data",
        variant: "destructive",
      });
    }
  };

  const shareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(
      () => toast({ title: "Link Copied", description: "Current filter URL copied to clipboard" }),
      () => toast({ title: "Copy Failed", description: "Failed to copy URL", variant: "destructive" }),
    );
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="gap-2" onClick={shareLink}>
        <Share2 className="h-4 w-4" />
        Share
      </Button>
      <Button size="sm" className="gap-2 shadow-sm" onClick={exportToCSV}>
        <Download className="h-4 w-4" />
        Export CSV
      </Button>
    </div>
  );
}
