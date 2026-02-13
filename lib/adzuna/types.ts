// lib/adzuna/types.ts

export interface AdzunaLocation {
  area: string[];
  display_name: string;
}

export interface AdzunaCompany {
  display_name: string;
}

export interface AdzunaCategory {
  label: string;
  tag: string;
}

export interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  created: string;
  company: AdzunaCompany;
  location: AdzunaLocation;
  category: AdzunaCategory;
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: string;
  contract_type?: string;
  redirect_url: string;
}

export interface AdzunaSearchResponse {
  results: AdzunaJob[];
  count: number;
  mean?: number;
}

export interface AdzunaSearchParams {
  what?: string;        // Job title or keywords
  where?: string;       // Location
  page?: number;        // Page number (starts at 1)
  results_per_page?: number;  // Results per page (max 50)
  sort_by?: 'relevance' | 'date' | 'salary';
  category?: string;    // Category tag
  max_days_old?: number;  // Filter jobs by age
  salary_min?: number;
  salary_max?: number;
}