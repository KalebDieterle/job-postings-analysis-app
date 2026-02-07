import {
  createSearchParamsCache,
  parseAsString,
  parseAsInteger,
  parseAsArrayOf,
  parseAsStringEnum,
} from "nuqs/server";

// Skill categories
export const SKILL_CATEGORIES = [
  "Programming Languages",
  "Frameworks & Libraries",
  "Databases & Data",
  "DevOps & Cloud",
  "Tools & Platforms",
  "Soft Skills",
  "AI/ML & Data Science",
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

// Experience levels
export const EXPERIENCE_LEVELS = [
  "Entry Level",
  "Mid-Senior Level",
  "Senior/Executive",
] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

// Sort options
export const SORT_OPTIONS = [
  "demand",
  "salary",
  "name",
  "trending",
  "growth",
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

// View options
export const VIEW_OPTIONS = ["grid", "table"] as const;

export type ViewOption = (typeof VIEW_OPTIONS)[number];

// Search params parsers
export const skillsSearchParamsParser = {
  q: parseAsString.withDefault(""),
  category: parseAsArrayOf(parseAsString).withDefault([]),
  demandMin: parseAsInteger.withDefault(0),
  demandMax: parseAsInteger.withDefault(10000),
  salaryMin: parseAsInteger.withDefault(40000),
  salaryMax: parseAsInteger.withDefault(200000),
  experience: parseAsArrayOf(parseAsString).withDefault([]),
  sort: parseAsStringEnum<SortOption>(Array.from(SORT_OPTIONS)).withDefault(
    "demand"
  ),
  view: parseAsStringEnum<ViewOption>(Array.from(VIEW_OPTIONS)).withDefault(
    "grid"
  ),
  page: parseAsInteger.withDefault(1),
};

// Create search params cache for server-side use
export const skillsSearchParamsCache = createSearchParamsCache(
  skillsSearchParamsParser
);

// Type for parsed search params
export type SkillsSearchParams = {
  q: string;
  category: string[];
  demandMin: number;
  demandMax: number;
  salaryMin: number;
  salaryMax: number;
  experience: string[];
  sort: SortOption;
  view: ViewOption;
  page: number;
};

// Helper to build URL with params
export function buildSkillsUrl(params: Partial<SkillsSearchParams>): string {
  const urlParams = new URLSearchParams();

  if (params.q) urlParams.set("q", params.q);
  if (params.category && params.category.length > 0) {
    params.category.forEach((c: string) => urlParams.append("category", c));
  }
  if (params.demandMin && params.demandMin > 0)
    urlParams.set("demandMin", params.demandMin.toString());
  if (params.demandMax && params.demandMax < 10000)
    urlParams.set("demandMax", params.demandMax.toString());
  if (params.salaryMin && params.salaryMin > 40000)
    urlParams.set("salaryMin", params.salaryMin.toString());
  if (params.salaryMax && params.salaryMax < 200000)
    urlParams.set("salaryMax", params.salaryMax.toString());
  if (params.experience && params.experience.length > 0) {
    params.experience.forEach((e: string) => urlParams.append("experience", e));
  }
  if (params.sort && params.sort !== "demand")
    urlParams.set("sort", params.sort);
  if (params.view && params.view !== "grid") urlParams.set("view", params.view);
  if (params.page && params.page > 1)
    urlParams.set("page", params.page.toString());

  const queryString = urlParams.toString();
  return queryString ? `/skills?${queryString}` : "/skills";
}

// Quick filter presets
export const QUICK_FILTERS = {
  trending: {
    label: "🔥 Trending Now",
    description: "Skills with >20% growth last 30 days",
  },
  highPaying: {
    label: "💰 High Paying",
    description: "Skills with avg salary >$120k",
    filters: { salaryMin: 120000 },
  },
  highDemand: {
    label: "🚀 In High Demand",
    description: "Skills with >1000 job postings",
    filters: { demandMin: 1000 },
  },
  emerging: {
    label: "🆕 Emerging Tech",
    description: "AI/ML, blockchain, quantum computing",
    filters: { category: ["AI/ML & Data Science"] },
  },
  cloudDevOps: {
    label: "☁️ Cloud & DevOps",
    description: "AWS, Azure, Docker, Kubernetes",
    filters: { category: ["DevOps & Cloud"] },
  },
  fullStack: {
    label: "💻 Full Stack",
    description: "React, Node.js, TypeScript, PostgreSQL",
    filters: { category: ["Frameworks & Libraries", "Programming Languages"] },
  },
  dataAnalytics: {
    label: "📊 Data & Analytics",
    description: "Python, SQL, Tableau, Power BI",
    filters: { category: ["Databases & Data", "AI/ML & Data Science"] },
  },
  security: {
    label: "🛡️ Security",
    description: "Security, encryption, penetration testing",
  },
} as const;

export type QuickFilterKey = keyof typeof QUICK_FILTERS;
