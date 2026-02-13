import { AdzunaSearchParams, AdzunaSearchResponse } from './types';

// Load environment variables for scripts
if (typeof window === 'undefined' && !process.env.ADZUNA_APP_ID) {
  require('dotenv').config({ path: '.env.local' });
}

const ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api';
const ADZUNA_COUNTRY = 'us'; // Change to your target country

class AdzunaClient {
  private appId: string;
  private appKey: string;
  private baseUrl: string;

  constructor() {
    this.appId = process.env.ADZUNA_APP_ID || '';
    this.appKey = process.env.ADZUNA_APP_KEY || '';
    this.baseUrl = `${ADZUNA_BASE_URL}/jobs/${ADZUNA_COUNTRY}`;

    if (!this.appId || !this.appKey) {
      console.error('Missing credentials:');
      console.error('ADZUNA_APP_ID:', this.appId ? 'Set' : 'NOT SET');
      console.error('ADZUNA_APP_KEY:', this.appKey ? 'Set' : 'NOT SET');
      throw new Error('Adzuna credentials not found in environment');
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

    const url = new URL(
      `${this.baseUrl}/search/${page}`,
    );

    url.searchParams.append('app_id', this.appId);
    url.searchParams.append('app_key', this.appKey);
    url.searchParams.append('results_per_page', results_per_page.toString());
    url.searchParams.append('sort_by', sort_by);

    if (what) url.searchParams.append('what', what);
    if (where) url.searchParams.append('where', where);

    // Add additional parameters
    Object.entries(otherParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    return url.toString();
  }

  async search(params: AdzunaSearchParams): Promise<AdzunaSearchResponse> {
    const url = this.buildSearchUrl(params);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Adzuna API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching from Adzuna:', error);
      throw error;
    }
  }

  async getTopRoles(limit = 10): Promise<AdzunaSearchResponse> {
    return this.search({
      results_per_page: limit,
      sort_by: 'relevance',
    });
  }

  async searchByRole(roleName: string): Promise<AdzunaSearchResponse> {
    return this.search({
      what: roleName,
      results_per_page: 20,
      sort_by: 'relevance',
    });
  }
}

export const adzunaClient = new AdzunaClient();
