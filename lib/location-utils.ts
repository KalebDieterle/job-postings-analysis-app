/**
 * Create a URL-friendly slug from location string
 * "San Francisco, CA, USA" -> "san-francisco-ca-usa"
 */
export function slugifyLocation(location: string | null): string {
  if (!location) return '';
  
  return location
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parse a location string into components
 */
export function parseLocation(location: string) {
  const parts = location.split(',').map(p => p.trim());
  
  return {
    city: parts[0] || '',
    state: parts[1] || '',
    country: parts[2] || parts[1] || '',
  };
}

/**
 * Geocode location to lat/lng using OpenStreetMap Nominatim
 * Free tier, no API key required
 */
export async function geocodeLocation(
  city: string, 
  state?: string, 
  country?: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = [city, state, country].filter(Boolean).join(', ');
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JobPostingsAnalysisApp/1.0',
      },
    });
    
    const data = await response.json();
    
    if (data && data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Format salary for display
 */
export function formatSalary(salary: number | null): string {
  if (!salary) return 'N/A';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(salary);
}

// Map full state names to abbreviations - same as in the page component
export const STATE_ABBREVIATIONS: Record<string, string> = {
  'alabama': 'al', 'alaska': 'ak', 'arizona': 'az', 'arkansas': 'ar',
  'california': 'ca', 'colorado': 'co', 'connecticut': 'ct', 'delaware': 'de',
  'florida': 'fl', 'georgia': 'ga', 'hawaii': 'hi', 'idaho': 'id',
  'illinois': 'il', 'indiana': 'in', 'iowa': 'ia', 'kansas': 'ks',
  'kentucky': 'ky', 'louisiana': 'la', 'maine': 'me', 'maryland': 'md',
  'massachusetts': 'ma', 'michigan': 'mi', 'minnesota': 'mn', 'mississippi': 'ms',
  'missouri': 'mo', 'montana': 'mt', 'nebraska': 'ne', 'nevada': 'nv',
  'new hampshire': 'nh', 'new jersey': 'nj', 'new mexico': 'nm', 'new york': 'ny',
  'north carolina': 'nc', 'north dakota': 'nd', 'ohio': 'oh', 'oklahoma': 'ok',
  'oregon': 'or', 'pennsylvania': 'pa', 'rhode island': 'ri', 'south carolina': 'sc',
  'south dakota': 'sd', 'tennessee': 'tn', 'texas': 'tx', 'utah': 'ut',
  'vermont': 'vt', 'virginia': 'va', 'washington': 'wa', 'west virginia': 'wv',
  'wisconsin': 'wi', 'wyoming': 'wy',
  'district of columbia': 'dc', 'puerto rico': 'pr'
};

/**
 * Generate a location slug that matches the database format
 * Database uses: city-stateAbbrev (e.g., "san-francisco-ca")
 * NOT: city-fullStateName-country
 */
export function generateLocationSlug(
  city?: string | null,
  state?: string | null,
  country?: string | null
): string {
  const parts: string[] = [];

  // Add city
  if (city) {
    parts.push(
      city
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    );
  }

  // Add state (abbreviated if full name)
  if (state) {
    const stateLower = state.toLowerCase().trim();
    const stateSlug = stateLower
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Check if it's a full state name that needs abbreviation
    const abbreviated = STATE_ABBREVIATIONS[stateLower] || 
                       STATE_ABBREVIATIONS[stateSlug] || 
                       stateSlug;
    
    parts.push(abbreviated);
  }

  // Note: We're NOT adding country to match the database format
  // The database uses city-state format (e.g., "san-francisco-ca")

  return parts.join('-');
}

/**
 * Alternative: If you want to keep country codes in URLs but need them
 * to work with the database, you can strip them in the detail page
 */
export function normalizeLocationSlug(slug: string): string {
  const parts = slug.split('-');
  
  // If it looks like city-state-country (ends with 2-char country code)
  if (parts.length >= 3 && parts[parts.length - 1].length === 2) {
    // Check if second-to-last part is a full state name
    const potentialState = parts[parts.length - 2];
    if (STATE_ABBREVIATIONS[potentialState]) {
      // Replace full state with abbreviation and remove country
      const newParts = [...parts];
      newParts[newParts.length - 2] = STATE_ABBREVIATIONS[potentialState];
      return newParts.slice(0, -1).join('-'); // Remove country code
    }
    
    // Otherwise just remove the country code
    return parts.slice(0, -1).join('-');
  }
  
  return slug;
}