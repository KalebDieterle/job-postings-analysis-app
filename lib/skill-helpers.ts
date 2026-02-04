/**
 * Categorizes a skill into a technology category
 * Used across Skills and Trending pages for consistent categorization
 */
export function categorizeSkill(name: string): string {
  const nameLower = name.toLowerCase();
  
  if (
    nameLower.includes("react") ||
    nameLower.includes("vue") ||
    nameLower.includes("angular") ||
    nameLower.includes("svelte") ||
    nameLower.includes("html") ||
    nameLower.includes("css") ||
    nameLower.includes("javascript") ||
    nameLower.includes("typescript") ||
    nameLower.includes("frontend")
  ) {
    return "Frontend";
  }
  
  if (
    nameLower.includes("python") ||
    nameLower.includes("java") ||
    nameLower.includes("node") ||
    nameLower.includes("spring") ||
    nameLower.includes("django") ||
    nameLower.includes("flask") ||
    nameLower.includes("go") ||
    nameLower.includes("rust") ||
    nameLower.includes("c++") ||
    nameLower.includes("backend")
  ) {
    return "Backend";
  }
  
  if (
    nameLower.includes("aws") ||
    nameLower.includes("docker") ||
    nameLower.includes("kubernetes") ||
    nameLower.includes("jenkins") ||
    nameLower.includes("terraform") ||
    nameLower.includes("ansible") ||
    nameLower.includes("ci/cd") ||
    nameLower.includes("devops")
  ) {
    return "DevOps";
  }
  
  if (
    nameLower.includes("sql") ||
    nameLower.includes("mongo") ||
    nameLower.includes("postgres") ||
    nameLower.includes("mysql") ||
    nameLower.includes("redis") ||
    nameLower.includes("database") ||
    nameLower.includes("db")
  ) {
    return "Database";
  }
  
  if (
    nameLower.includes("ios") ||
    nameLower.includes("android") ||
    nameLower.includes("mobile") ||
    nameLower.includes("react native") ||
    nameLower.includes("flutter") ||
    nameLower.includes("swift") ||
    nameLower.includes("kotlin")
  ) {
    return "Mobile";
  }
  
  if (
    nameLower.includes("cloud") ||
    nameLower.includes("azure") ||
    nameLower.includes("gcp") ||
    nameLower.includes("google cloud")
  ) {
    return "Cloud";
  }
  
  if (
    nameLower.includes("ml") ||
    nameLower.includes("ai") ||
    nameLower.includes("pytorch") ||
    nameLower.includes("tensorflow") ||
    nameLower.includes("machine learning") ||
    nameLower.includes("artificial intelligence") ||
    nameLower.includes("deep learning") ||
    nameLower.includes("neural")
  ) {
    return "AI";
  }
  
  return "Technology";
}

/**
 * Color schemes for skill categories
 * Provides consistent visual styling across the application
 */
export const getCategoryColors = (category: string) => {
  const colorSchemes: Record<
    string,
    { bg: string; text: string; bar: string }
  > = {
    Frontend: {
      bg: "bg-blue-50 dark:bg-blue-900/30",
      text: "text-blue-500",
      bar: "bg-blue-500",
    },
    Backend: {
      bg: "bg-emerald-50 dark:bg-emerald-900/30",
      text: "text-emerald-500",
      bar: "bg-emerald-500",
    },
    DevOps: {
      bg: "bg-orange-50 dark:bg-orange-900/30",
      text: "text-orange-500",
      bar: "bg-orange-500",
    },
    Database: {
      bg: "bg-indigo-50 dark:bg-indigo-900/30",
      text: "text-indigo-500",
      bar: "bg-indigo-500",
    },
    Mobile: {
      bg: "bg-red-50 dark:bg-red-900/30",
      text: "text-red-500",
      bar: "bg-red-500",
    },
    Cloud: {
      bg: "bg-cyan-50 dark:bg-cyan-900/30",
      text: "text-cyan-500",
      bar: "bg-cyan-500",
    },
    AI: {
      bg: "bg-violet-50 dark:bg-violet-900/30",
      text: "text-violet-500",
      bar: "bg-violet-500",
    },
    default: { 
      bg: "bg-primary/10", 
      text: "text-primary", 
      bar: "bg-primary" 
    },
  };

  return colorSchemes[category] || colorSchemes.default;
};
