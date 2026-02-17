import { AdzunaSearchParams, AdzunaSearchResponse } from './types';

const ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api';
const ADZUNA_COUNTRY = 'us';

class AdzunaClient {
  private appId: string;
  private appKey: string;
  private baseUrl: string;

  constructor() {
    // Load .env.local for local script usage
    if (typeof window === 'undefined' && !process.env.ADZUNA_APP_ID) {
      require('dotenv').config({ path: '.env.local' });
    }

    this.appId = process.env.ADZUNA_APP_ID || '';
    this.appKey = process.env.ADZUNA_APP_KEY || '';
    this.baseUrl = `${ADZUNA_BASE_URL}/jobs/${ADZUNA_COUNTRY}`;

    if (!this.appId || !this.appKey) {
      throw new Error(
        'Adzuna credentials not found. Set ADZUNA_APP_ID and ADZUNA_APP_KEY.'
      );
    }
  }

  private buildSearchUrl(params: AdzunaSearchParams): string {
    const { 
      what = '', 
      where = '', 
      page = 1,
      results_per_page = 20,
      sort_by = 'relevance',
      ...otherParams 
    } = params;

    const url = new URL(`${this.baseUrl}/search/${page}`);

    url.searchParams.append('app_id', this.appId);
    url.searchParams.append('app_key', this.appKey);
    url.searchParams.append('results_per_page', results_per_page.toString());
    url.searchParams.append('sort_by', sort_by);

    if (what) url.searchParams.append('what', what);
    if (where) url.searchParams.append('where', where);

    Object.entries(otherParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    return url.toString();
  }

  async search(params: AdzunaSearchParams): Promise<AdzunaSearchResponse> {
    const url = this.buildSearchUrl(params);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Adzuna API error: ${response.status}`);
    }
    return response.json();
  }

  async getTopRoles(limit = 10): Promise<AdzunaSearchResponse> {
    return this.search({ results_per_page: limit, sort_by: 'relevance' });
  }

  async searchByRole(roleName: string): Promise<AdzunaSearchResponse> {
    return this.search({ what: roleName, results_per_page: 20, sort_by: 'relevance' });
  }
}

/**
 * Lazy-initialized Adzuna client.
 * Only throws if credentials are missing when you actually USE it,
 * not when the module is imported. This prevents build-time crashes
 * on Vercel where ADZUNA_APP_ID isn't set.
 */
let _client: AdzunaClient | null = null;
export function getAdzunaClient(): AdzunaClient {
  if (!_client) _client = new AdzunaClient();
  return _client;
}

// Backwards-compatible proxy: defers instantiation until first property access
export const adzunaClient = new Proxy({} as AdzunaClient, {
  get(_, prop) {
    return (getAdzunaClient() as any)[prop];
  },
});
