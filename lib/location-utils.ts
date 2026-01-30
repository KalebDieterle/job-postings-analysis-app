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