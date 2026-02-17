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
 * Keyword dictionary mapping each skill_abr to trigger words/phrases.
 * Uses word-boundary-aware matching to prevent false positives
 * (e.g., "java" won't match "javascript").
 * 
 * 35 functional skill categories × ~5-8 keyword triggers each.
 */
export const SKILL_KEYWORDS: [string, string[]][] = [
  ['ACCT', ['accounting', 'auditing', 'bookkeeping', 'cpa', 'tax compliance', 'accounts payable', 'accounts receivable']],
  ['ADM', ['administrative', 'office manager', 'receptionist', 'executive assistant', 'office coordinator', 'clerical']],
  ['ADVR', ['advertising', 'media buyer', 'ad campaign', 'brand awareness', 'media planning', 'copywriter']],
  ['ANLS', ['analyst', 'analytics', 'data analysis', 'business intelligence', 'reporting', 'insights', 'tableau', 'power bi']],
  ['ART', ['graphic design', 'creative director', 'illustrator', 'visual design', 'ui artist', 'art director']],
  ['BD', ['business development', 'partnerships', 'strategic alliance', 'client acquisition', 'growth strategy']],
  ['CNSL', ['consulting', 'consultant', 'advisory', 'strategy consulting']],
  ['CUST', ['customer service', 'customer support', 'client success', 'customer experience', 'helpdesk', 'call center', 'support specialist']],
  ['DSGN', ['designer', 'ux design', 'ui design', 'product design', 'interaction design', 'figma', 'user experience', 'user interface']],
  ['DIST', ['distribution', 'logistics', 'warehouse', 'shipping', 'fulfillment', 'supply chain logistics']],
  ['EDU', ['education', 'training specialist', 'curriculum', 'instructional', 'teaching', 'e-learning', 'learning management']],
  ['ENG', ['engineer', 'engineering', 'devops', 'sre', 'infrastructure', 'backend', 'frontend', 'fullstack', 'full stack', 'full-stack', 'embedded', 'systems engineer']],
  ['FIN', ['finance', 'financial', 'fiscal', 'treasury', 'investment', 'portfolio', 'wealth management', 'fintech']],
  ['GENB', ['general business', 'operations', 'business operations', 'business analyst', 'process improvement', 'business process']],
  ['HCPR', ['healthcare', 'health care', 'clinical', 'nursing', 'physician', 'medical', 'patient care', 'pharmacy', 'therapist']],
  ['HR', ['human resources', 'recruiting', 'recruiter', 'talent acquisition', 'people operations', 'hris', 'compensation', 'benefits specialist', 'onboarding']],
  ['IT', ['software', 'developer', 'programmer', 'information technology', 'computing', 'tech lead', 'technical lead', 'platform', 'cloud', 'aws', 'azure', 'gcp', 'cybersecurity', 'security engineer', 'network engineer', 'sysadmin', 'devops']],
  ['LGL', ['legal', 'attorney', 'lawyer', 'paralegal', 'compliance', 'regulatory', 'contracts', 'litigation', 'intellectual property']],
  ['MGMT', ['manager', 'management', 'director', 'vice president', 'vp ', 'head of', 'lead', 'supervisor', 'team lead', 'principal']],
  ['MNFC', ['manufacturing', 'production engineer', 'plant manager', 'assembly', 'fabrication', 'lean manufacturing', 'six sigma']],
  ['MRKT', ['marketing', 'seo', 'sem', 'content marketing', 'digital marketing', 'social media', 'brand manager', 'growth marketing', 'demand generation']],
  ['OTHR', []], // No keywords — catch-all, not matched by keywords
  ['PRDM', ['product manager', 'product management', 'product owner', 'product lead', 'product strategy', 'roadmap']],
  ['PROD', ['production', 'manufacturing', 'assembly line', 'quality control', 'production planning']],
  ['PRJM', ['project manager', 'project management', 'scrum master', 'agile coach', 'pmp', 'program manager', 'program management', 'jira']],
  ['PR', ['public relations', 'communications', 'press', 'media relations', 'corporate communications', 'spokesperson']],
  ['PRCH', ['purchasing', 'procurement', 'sourcing', 'vendor management', 'supply chain', 'buyer']],
  ['QA', ['quality assurance', 'qa engineer', 'test engineer', 'testing', 'automation testing', 'sdet', 'test automation', 'quality engineer']],
  ['RSCH', ['research', 'researcher', 'r&d', 'research and development', 'scientific research', 'clinical research', 'market research']],
  ['SALE', ['sales', 'account executive', 'account manager', 'revenue', 'quota', 'sales engineer', 'inside sales', 'outside sales', 'business development representative']],
  ['SCI', ['science', 'scientist', 'biology', 'chemistry', 'physics', 'lab ', 'laboratory', 'bioinformatics', 'data scientist']],
  ['STRA', ['strategy', 'strategic planning', 'corporate strategy', 'business strategy', 'strategy analyst', 'chief strategy']],
  ['SUPL', ['supply chain', 'procurement', 'inventory', 'sourcing', 'supplier', 'demand planning', 'logistics']],
  ['TRNG', ['training', 'trainer', 'learning and development', 'l&d', 'corporate training', 'skills development', 'onboarding training']],
  ['WRT', ['writing', 'editing', 'editor', 'copywriting', 'technical writer', 'content writer', 'content creator', 'documentation']],
];

/**
 * Match skills for a given title + description using word-boundary-aware matching.
 * Returns array of matched skill_abr values.
 */
export function matchSkills(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const matched: string[] = [];

  for (const [skillAbr, keywords] of SKILL_KEYWORDS) {
    if (keywords.length === 0) continue; // Skip OTHR

    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();
      const idx = text.indexOf(kw);
      if (idx === -1) continue;

      // Check word boundaries
      const charBefore = idx > 0 ? text[idx - 1] : ' ';
      const charAfter = idx + kw.length < text.length ? text[idx + kw.length] : ' ';

      const isWordBoundaryBefore = /[\s,;:.()\-\/]/.test(charBefore) || idx === 0;
      // Multi-word keywords don't require strict boundary after
      const isWordBoundaryAfter = kw.includes(' ') || /[\s,;:.()\-\/]/.test(charAfter) || (idx + kw.length === text.length);

      if (isWordBoundaryBefore && isWordBoundaryAfter) {
        matched.push(skillAbr);
        break; // One match per skill is enough
      }
    }
  }

  return matched;
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
