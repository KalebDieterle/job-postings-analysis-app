"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Clock, Bookmark } from "lucide-react";
import { formatSalary } from "@/lib/location-utils";
import { formatRelativeTime } from "@/lib/location-analytics";
import { motion } from "framer-motion";

interface JobCardProps {
  job: {
    jobId: string;
    title: string;
    companyName: string;
    remoteAllowed?: boolean | string | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    experienceLevel?: string | null;
    listedTime?: Date | string | null;
    jobPostingUrl?: string | null;
  };
}

export function JobCard({ job }: JobCardProps) {
  const isRemote =
    job.remoteAllowed === true ||
    job.remoteAllowed === "1" ||
    job.remoteAllowed === "true";
  const companyInitial = job.companyName.charAt(0).toUpperCase();

  // Convert listedTime to Date if it's a string
  const listedDate =
    typeof job.listedTime === "string"
      ? new Date(job.listedTime)
      : job.listedTime;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      <Card className="hover:shadow-lg transition-all duration-200">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {companyInitial}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-lg line-clamp-1">
                  {job.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {job.companyName}
                </p>
              </div>
            </div>
            {isRemote && (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-200 flex-shrink-0">
                Remote
              </Badge>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-wrap gap-3 mb-4">
            {job.salaryMin && job.salaryMax && (
              <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                <DollarSign className="w-4 h-4" />
                <span>
                  {formatSalary(job.salaryMin)} - {formatSalary(job.salaryMax)}
                </span>
              </div>
            )}
            {job.experienceLevel && (
              <Badge variant="outline" className="font-normal">
                {job.experienceLevel}
              </Badge>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                {listedDate
                  ? formatRelativeTime(listedDate)
                  : "Recently posted"}
              </span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Bookmark className="w-4 h-4" />
              </Button>
              {job.jobPostingUrl ? (
                <Button size="sm" asChild>
                  <a
                    href={job.jobPostingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View
                  </a>
                </Button>
              ) : (
                <Button size="sm" disabled>
                  View
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
