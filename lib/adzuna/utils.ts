import { adzunaClient } from './client';
import { adzunaCache } from './cache';
import { AdzunaSearchParams, AdzunaSearchResponse } from './types';

/**
 * Fetch jobs with caching
 */
export async function fetchJobsWithCache(
  params: AdzunaSearchParams
): Promise<AdzunaSearchResponse> {
  const cacheKey = JSON.stringify(params);
  
  // Try to get from cache first
  const cached = adzunaCache.get<AdzunaSearchResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const response = await adzunaClient.search(params);
  
  // Cache the result
  adzunaCache.set(cacheKey, response);
  
  return response;
}

/**
 * Extract skills from job descriptions (simple keyword matching)
 */
export function extractSkills(description: string): string[] {
  const commonSkills = [
    'javascript', 'typescript', 'python', 'java', 'react',
    'node.js', 'sql', 'aws', 'docker', 'kubernetes',
    'git', 'agile', 'rest api', 'graphql', 'mongodb'
  ];

  const lowerDesc = description.toLowerCase();
  return commonSkills.filter(skill => 
    lowerDesc.includes(skill.toLowerCase())
  );
}

/**
 * Format salary range
 */
export function formatSalary(
  min?: number, 
  max?: number, 
  isPredicted?: string
): string {
  if (!min && !max) return 'Not specified';
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  });

  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}${isPredicted === '1' ? ' (predicted)' : ''}`;
  }
  
  if (min) {
    return `From ${formatter.format(min)}${isPredicted === '1' ? ' (predicted)' : ''}`;
  }
  
  return `Up to ${formatter.format(max!)}${isPredicted === '1' ? ' (predicted)' : ''}`;
}

