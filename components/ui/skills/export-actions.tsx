"use client";

import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SkillExportData {
  name: string;
  count: number;
  avg_salary: number;
  category?: string;
  growth?: number;
}

interface ExportActionsProps {
  data: SkillExportData[];
  filters?: Record<string, any>;
}

export function ExportActions({ data, filters }: ExportActionsProps) {
  const { toast } = useToast();

  const exportToCSV = () => {
    try {
      const headers = ["Skill", "Category", "Demand", "Avg Salary", "Growth %"];

      const rows = data.map((skill) => [
        skill.name,
        skill.category || "N/A",
        skill.count,
        skill.avg_salary,
        skill.growth || "N/A",
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `skills-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Exported ${data.length} skills to CSV`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data",
        variant: "destructive",
      });
    }
  };

  const shareFilters = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(
      () => {
        toast({
          title: "Link Copied",
          description: "Current filter URL copied to clipboard",
        });
      },
      () => {
        toast({
          title: "Copy Failed",
          description: "Failed to copy URL to clipboard",
          variant: "destructive",
        });
      },
    );
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" className="gap-2" onClick={shareFilters}>
        <Share2 className="h-4 w-4" />
        Share Filters
      </Button>
      <Button className="gap-2 shadow-sm" onClick={exportToCSV}>
        <Download className="h-4 w-4" />
        Export Data
      </Button>
    </div>
  );
}
