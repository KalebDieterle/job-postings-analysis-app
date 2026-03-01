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

type SkillCategoryRule = {
  category: SkillCategory;
  keywords: readonly string[];
};

export const DEFAULT_SKILL_CATEGORY: SkillCategory = "Tools & Platforms";

export const SKILL_CATEGORY_RULES: readonly SkillCategoryRule[] = [
  {
    category: "AI/ML & Data Science",
    keywords: [
      "artificial intelligence",
      "machine learning",
      "data science",
      "deep learning",
      "neural",
      "llm",
      "gpt",
      "tensorflow",
      "pytorch",
      "nlp",
      "computer vision",
      "science",
      "research",
      "analytics",
    ],
  },
  {
    category: "Programming Languages",
    keywords: [
      "python",
      "java",
      "javascript",
      "typescript",
      "golang",
      "rust",
      "c++",
      "c#",
      "ruby",
      "php",
      "swift",
      "kotlin",
      "scala",
    ],
  },
  {
    category: "Frameworks & Libraries",
    keywords: [
      "react",
      "next.js",
      "nextjs",
      "vue",
      "angular",
      "svelte",
      "node",
      "express",
      "spring",
      "django",
      "flask",
      "fastapi",
      "laravel",
      "rails",
      "bootstrap",
      "tailwind",
    ],
  },
  {
    category: "Databases & Data",
    keywords: [
      "sql",
      "postgres",
      "mysql",
      "mongodb",
      "mongo",
      "redis",
      "snowflake",
      "bigquery",
      "data warehouse",
      "etl",
      "spark",
      "hadoop",
      "tableau",
      "power bi",
      "dbt",
      "analyst",
      "finance",
      "accounting",
      "strategy/planning",
    ],
  },
  {
    category: "DevOps & Cloud",
    keywords: [
      "aws",
      "azure",
      "gcp",
      "google cloud",
      "docker",
      "kubernetes",
      "terraform",
      "ansible",
      "jenkins",
      "devops",
      "ci/cd",
      "sre",
      "serverless",
      "infrastructure",
      "operations",
      "information technology",
      "manufacturing",
      "production",
      "supply chain",
      "distribution",
    ],
  },
  {
    category: "Soft Skills",
    keywords: [
      "management",
      "business development",
      "sales",
      "marketing",
      "customer service",
      "legal",
      "human resources",
      "consulting",
      "administrative",
      "training",
      "education",
      "writing/editing",
      "public relations",
      "communication",
      "leadership",
      "stakeholder",
      "collaboration",
      "presentation",
      "mentoring",
      "problem solving",
      "teamwork",
    ],
  },
];

export function categorizeSkill(name: string): SkillCategory {
  const skill = name.toLowerCase();

  for (const rule of SKILL_CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => skill.includes(keyword))) {
      return rule.category;
    }
  }

  return DEFAULT_SKILL_CATEGORY;
}
