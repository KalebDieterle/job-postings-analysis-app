import type { MetadataRoute } from "next";
import { getTopJobTitles } from "@/db/queries";
import { getAllSkills } from "@/db/queries";
import { getAllCompanyData } from "@/db/queries";
import { slugify } from "@/lib/slugify";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

function companySlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/roles`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/skills`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/companies`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/locations`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/trends`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/intelligence/salary-predictor`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  // Dynamic role pages
  let roleRoutes: MetadataRoute.Sitemap = [];
  try {
    const roles = await getTopJobTitles(150);
    roleRoutes = (roles as { title: string }[])
      .filter((r) => r.title && slugify(r.title))
      .map((r) => ({
        url: `${BASE_URL}/roles/${slugify(r.title)}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
  } catch {
    // Non-fatal: skip dynamic role routes
  }

  // Dynamic skill pages
  let skillRoutes: MetadataRoute.Sitemap = [];
  try {
    const skills = await getAllSkills({ limit: 200 });
    skillRoutes = (skills as { name: string }[])
      .filter((s) => s.name)
      .map((s) => ({
        url: `${BASE_URL}/skills/${slugify(s.name)}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
  } catch {
    // Non-fatal: skip dynamic skill routes
  }

  // Dynamic company pages
  let companyRoutes: MetadataRoute.Sitemap = [];
  try {
    const companies = await getAllCompanyData({ limit: 200 });
    companyRoutes = (companies as { name: string }[])
      .filter((c) => c.name && companySlug(c.name))
      .map((c) => ({
        url: `${BASE_URL}/companies/${companySlug(c.name)}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
  } catch {
    // Non-fatal: skip dynamic company routes
  }

  return [...staticRoutes, ...roleRoutes, ...skillRoutes, ...companyRoutes];
}
