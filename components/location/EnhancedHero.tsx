"use client";

import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  calculateRemotePercentage,
  getCompetitionLevel,
} from "@/lib/location-analytics";

interface EnhancedHeroProps {
  locationName: string;
  stats: {
    totalJobs: number | string;
    totalCompanies: number | string;
  };
  recentJobs: Array<{ remoteAllowed?: boolean | null }>;
}

export function EnhancedHero({
  locationName,
  stats,
  recentJobs,
}: EnhancedHeroProps) {
  const remotePercentage = calculateRemotePercentage(recentJobs);
  const totalCompanies = Number(stats.totalCompanies);
  const jobsPerCompany =
    totalCompanies > 0 ? Number(stats.totalJobs) / totalCompanies : 0;
  const competition = getCompetitionLevel(jobsPerCompany);

  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="mb-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Location Header */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-3 mb-4"
      >
        <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-3 rounded-lg">
          <MapPin className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold">{locationName}</h1>
          <p className="text-muted-foreground">
            Job market insights and analytics
          </p>
        </div>
      </motion.div>

      {/* Quick Stats Pills */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
        <Badge variant="secondary" className="px-4 py-2 text-sm">
          <span className="font-semibold">{remotePercentage}%</span>
          <span className="ml-1">Remote opportunities</span>
        </Badge>

        <Badge
          variant="secondary"
          className={`px-4 py-2 text-sm ${
            competition.color === "green"
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : competition.color === "yellow"
                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                : "bg-red-100 text-red-700 hover:bg-red-200"
          }`}
        >
          <span className="font-semibold">{competition.level}</span>
          <span className="ml-1">Competition</span>
        </Badge>

        <Badge variant="secondary" className="px-4 py-2 text-sm">
          <span className="font-semibold">{jobsPerCompany.toFixed(1)}</span>
          <span className="ml-1">Jobs per company</span>
        </Badge>
      </motion.div>
    </motion.div>
  );
}
