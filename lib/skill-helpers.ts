import {
  categorizeSkill as canonicalCategorizeSkill,
  type SkillCategory,
} from "@/lib/skill-categories";

export function categorizeSkill(name: string): SkillCategory {
  return canonicalCategorizeSkill(name);
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
    "Programming Languages": {
      bg: "bg-blue-50 dark:bg-blue-900/30",
      text: "text-blue-500",
      bar: "bg-blue-500",
    },
    "Frameworks & Libraries": {
      bg: "bg-emerald-50 dark:bg-emerald-900/30",
      text: "text-emerald-500",
      bar: "bg-emerald-500",
    },
    "DevOps & Cloud": {
      bg: "bg-orange-50 dark:bg-orange-900/30",
      text: "text-orange-500",
      bar: "bg-orange-500",
    },
    "Databases & Data": {
      bg: "bg-indigo-50 dark:bg-indigo-900/30",
      text: "text-indigo-500",
      bar: "bg-indigo-500",
    },
    "Tools & Platforms": {
      bg: "bg-red-50 dark:bg-red-900/30",
      text: "text-red-500",
      bar: "bg-red-500",
    },
    "Soft Skills": {
      bg: "bg-cyan-50 dark:bg-cyan-900/30",
      text: "text-cyan-500",
      bar: "bg-cyan-500",
    },
    "AI/ML & Data Science": {
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
