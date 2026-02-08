"use client";

import { useMemo, useState } from "react";
import { JobFilters } from "./JobFilters";
import { JobCard } from "./JobCard";
import { PaginationControls } from "@/components/ui/skills/pagination-controls";
import { Briefcase } from "lucide-react";

interface Job {
  jobId: string;
  title: string;
  companyName: string;
  remoteAllowed?: boolean | string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  experienceLevel?: string | null;
  listedTime?: Date | string | null;
}

interface JobsSectionProps {
  jobs: Job[];
}

const JOBS_PER_PAGE = 20;

export function JobsSection({ jobs }: JobsSectionProps) {
  const [search, setSearch] = useState("");
  const [workMode, setWorkMode] = useState("all");
  const [experience, setExperience] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and sort jobs
  const filteredAndSortedJobs = useMemo(() => {
    let filtered = [...jobs];

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(searchLower) ||
          job.companyName.toLowerCase().includes(searchLower)
      );
    }

    // Apply work mode filter
    if (workMode !== "all") {
      if (workMode === "remote") {
        filtered = filtered.filter(
          (job) =>
            job.remoteAllowed === true ||
            job.remoteAllowed === "1" ||
            job.remoteAllowed === "true"
        );
      } else if (workMode === "onsite") {
        filtered = filtered.filter(
          (job) =>
            job.remoteAllowed === false ||
            job.remoteAllowed === "0" ||
            job.remoteAllowed === "false" ||
            job.remoteAllowed === null
        );
      }
      // Note: "hybrid" filter would need additional data field
    }

    // Apply experience level filter
    if (experience !== "all") {
      filtered = filtered.filter((job) => {
        if (!job.experienceLevel) return false;
        const level = job.experienceLevel.toLowerCase();
        
        if (experience === "entry") {
          return level.includes("entry") || level.includes("junior") || level.includes("associate");
        } else if (experience === "mid") {
          return level.includes("mid") || level.includes("intermediate");
        } else if (experience === "senior") {
          return level.includes("senior") || level.includes("staff");
        } else if (experience === "lead") {
          return level.includes("lead") || level.includes("principal") || level.includes("director");
        }
        return false;
      });
    }

    // Apply sorting
    if (sortBy === "date") {
      filtered.sort((a, b) => {
        const dateA = a.listedTime ? new Date(a.listedTime).getTime() : 0;
        const dateB = b.listedTime ? new Date(b.listedTime).getTime() : 0;
        return dateB - dateA; // Most recent first
      });
    } else if (sortBy === "salary") {
      filtered.sort((a, b) => {
        const salaryA = a.salaryMax || a.salaryMin || 0;
        const salaryB = b.salaryMax || b.salaryMin || 0;
        return salaryB - salaryA; // Highest salary first
      });
    }

    return filtered;
  }, [jobs, search, workMode, experience, sortBy]);

  // Paginate jobs
  const totalPages = Math.ceil(filteredAndSortedJobs.length / JOBS_PER_PAGE);
  const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
  const endIndex = startIndex + JOBS_PER_PAGE;
  const paginatedJobs = filteredAndSortedJobs.slice(startIndex, endIndex);

  // Handle filter changes
  const handleFilterChange = (filters: {
    search: string;
    workMode: string;
    experience: string;
    sortBy: string;
  }) => {
    setSearch(filters.search);
    setWorkMode(filters.workMode);
    setExperience(filters.experience);
    setSortBy(filters.sortBy);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Build pagination URL (for this client component, we just use page numbers)
  const buildPageUrl = (page: number) => {
    return `#page-${page}`;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of jobs section
    document.getElementById("jobs-section")?.scrollIntoView({ 
      behavior: "smooth",
      block: "start"
    });
  };

  return (
    <div id="jobs-section" className="mt-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Briefcase className="w-6 h-6" />
        Recent Job Openings
      </h2>

      <JobFilters
        onFilterChange={handleFilterChange}
        initialValues={{
          search,
          workMode,
          experience,
          sortBy,
        }}
      />

      {/* Results Count */}
      <div className="mb-4 text-sm text-muted-foreground">
        Showing {paginatedJobs.length} of {filteredAndSortedJobs.length} jobs
        {filteredAndSortedJobs.length !== jobs.length && (
          <span> (filtered from {jobs.length} total)</span>
        )}
      </div>

      {/* Job Cards Grid */}
      {paginatedJobs.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {paginatedJobs.map((job) => (
              <JobCard key={job.jobId} job={job} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 pt-6 border-t">
              <PaginationControls
                currentPage={currentPage}
                hasNextPage={currentPage < totalPages}
                hasPrevPage={currentPage > 1}
                buildPageUrl={buildPageUrl}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">No jobs found</p>
          <p className="text-muted-foreground mb-4">
            Try adjusting your filters to see more results
          </p>
          <button
            onClick={() => {
              setSearch("");
              setWorkMode("all");
              setExperience("all");
              setSortBy("date");
              setCurrentPage(1);
            }}
            className="text-primary hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
