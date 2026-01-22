"use client";

import { useQuery } from "@tanstack/react-query";

interface Skill {
  name: string;
  count: number;
  avgSalary: number;
}

export function useSkills(filters: { search?: string; page?: number; limit?: number }) {
  return useQuery<Skill[]>({
    queryKey: ["skills", filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: filters.search || "",
        page: (filters.page || 1).toString(),
        limit: (filters.limit || 12).toString(),
      });
      
      const res = await fetch(`/api/skills?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch skills");
      return res.json();
    },
    // Keep previous data when fetching new pages for a smoother UX
    placeholderData: (previousData: Skill[] | undefined) => previousData,
  });
}