import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { MapPin, Building2, Clock, DollarSign } from "lucide-react";

interface RecentPosting {
  job_id: string;
  title: string;
  company_name: string;
  location: string | null;
  listed_time: Date;
  min_salary: number | null;
  max_salary: number | null;
}

function formatTimeAgo(timestamp: Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "Just now";
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function RecentActivityFeed({ data }: { data: RecentPosting[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Job Postings</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Latest opportunities in the market
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {data.map((posting, idx) => (
            <Link
              key={idx}
              href={`/roles`}
              className="block p-3 rounded-lg border hover:border-primary hover:bg-accent transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                    {truncateText(posting.title, 50)}
                  </h4>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {truncateText(posting.company_name, 25)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {truncateText(posting.location ?? "Remote", 20)}
                    </span>
                  </div>
                  {posting.min_salary && posting.max_salary && (
                    <div className="flex items-center gap-1 mt-2 text-xs font-medium text-green-600">
                      <DollarSign className="h-3 w-3" />
                      ${(posting.min_salary / 1000).toFixed(0)}k - ${(posting.max_salary / 1000).toFixed(0)}k
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3" />
                  {formatTimeAgo(posting.listed_time)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
