/**
 * Utility functions for location analytics calculations
 */

interface Job {
  remoteAllowed?: boolean | null;
  listedTime?: Date | string;
  salaryMin?: number;
  salaryMax?: number;
}

interface LocationStats {
  totalJobs: number | string;
  totalCompanies: number | string;
  avgMinSalary?: number | string | null;
  avgMedSalary?: number | string | null;
  avgMaxSalary?: number | string | null;
}

/**
 * Calculate the percentage of jobs that allow remote work
 */
export function calculateRemotePercentage(jobs: Job[]): number {
  if (jobs.length === 0) return 0;
  const remoteCount = jobs.filter(job => job.remoteAllowed === true).length;
  return Math.round((remoteCount / jobs.length) * 100);
}

/**
 * Calculate a market health score based on various metrics
 * Returns a score from 0-100
 */
export function calculateMarketHealthScore(stats: LocationStats): number {
  const totalJobs = Number(stats.totalJobs);
  const totalCompanies = Number(stats.totalCompanies);
  const avgSalary = Number(stats.avgMedSalary || 0);

  if (totalJobs === 0 || totalCompanies === 0) return 0;

  // Jobs per company ratio (0-40 points) - sweet spot is 5-10 jobs per company
  const jobsPerCompany = totalJobs / totalCompanies;
  let ratioScore = 0;
  if (jobsPerCompany < 2) {
    ratioScore = jobsPerCompany * 10; // 0-20 points
  } else if (jobsPerCompany <= 10) {
    ratioScore = 20 + ((jobsPerCompany - 2) / 8) * 20; // 20-40 points
  } else {
    ratioScore = 40;
  }

  // Salary score (0-40 points) - benchmark against $60k-$150k range
  let salaryScore = 0;
  if (avgSalary > 0) {
    if (avgSalary < 40000) {
      salaryScore = (avgSalary / 40000) * 15;
    } else if (avgSalary <= 150000) {
      salaryScore = 15 + ((avgSalary - 40000) / 110000) * 25;
    } else {
      salaryScore = 40;
    }
  }

  // Market size score (0-20 points)
  let sizeScore = 0;
  if (totalJobs < 100) {
    sizeScore = (totalJobs / 100) * 10;
  } else if (totalJobs <= 1000) {
    sizeScore = 10 + ((totalJobs - 100) / 900) * 10;
  } else {
    sizeScore = 20;
  }

  return Math.round(ratioScore + salaryScore + sizeScore);
}

/**
 * Determine competition level based on jobs-to-companies ratio
 */
export function getCompetitionLevel(jobsPerCompany: number): {
  level: 'Low' | 'Medium' | 'High';
  color: string;
} {
  if (jobsPerCompany < 3) {
    return { level: 'High', color: 'red' }; // Fewer jobs per company = high competition
  } else if (jobsPerCompany < 7) {
    return { level: 'Medium', color: 'yellow' };
  } else {
    return { level: 'Low', color: 'green' }; // Many jobs per company = low competition
  }
}

/**
 * Format a date as relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

/**
 * Calculate what percentile a salary is in within a distribution
 */
export function calculateSalaryPercentile(
  salary: number,
  distribution: number[]
): number {
  if (distribution.length === 0) return 50;
  
  const sorted = [...distribution].sort((a, b) => a - b);
  const position = sorted.filter(s => s <= salary).length;
  return Math.round((position / sorted.length) * 100);
}

/**
 * Get trend indicator based on value
 */
export function getTrendIndicator(value: number): {
  arrow: string;
  color: string;
  label: string;
} {
  if (value > 5) {
    return { arrow: '↑', color: 'text-green-500', label: 'Growing' };
  } else if (value < -5) {
    return { arrow: '↓', color: 'text-red-500', label: 'Declining' };
  } else {
    return { arrow: '→', color: 'text-gray-500', label: 'Stable' };
  }
}

/**
 * Format large numbers with K/M suffix
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Calculate work mode distribution from jobs
 */
export function calculateWorkModeDistribution(jobs: Job[]): {
  remote: number;
  hybrid: number;
  onsite: number;
} {
  if (jobs.length === 0) {
    return { remote: 0, hybrid: 0, onsite: 0 };
  }

  const remoteCount = jobs.filter(j => j.remoteAllowed === true).length;
  // Assume 20% of remaining are hybrid (this is a placeholder)
  const remainingJobs = jobs.length - remoteCount;
  const hybridCount = Math.floor(remainingJobs * 0.2);
  const onsiteCount = remainingJobs - hybridCount;

  return {
    remote: remoteCount,
    hybrid: hybridCount,
    onsite: onsiteCount,
  };
}

/**
 * Get color based on salary value
 */
export function getSalaryColor(salary: number): string {
  if (salary < 50000) return '#ef4444'; // red
  if (salary < 100000) return '#f59e0b'; // amber
  return '#10b981'; // green
}
