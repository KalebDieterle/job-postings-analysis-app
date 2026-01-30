// lib/geocoding-service.ts
// Reusable geocoding service for both batch scripts and API imports

interface GeocodingResult {
  lat: number;
  lng: number;
}

interface GeocodingCache {
  [key: string]: GeocodingResult | null;
}

/**
 * In-memory cache for geocoding results
 * Prevents duplicate API calls for the same location
 */
const geocodingCache: GeocodingCache = {};

/**
 * Create a cache key from location components
 */
function getCacheKey(city: string, state?: string | null, country?: string | null): string {
  return [city, state, country]
    .filter(Boolean)
    .map(s => s?.toLowerCase().trim())
    .join('|');
}

/**
 * Geocode using OpenStreetMap Nominatim (Free)
 * Rate limit: 1 request per second
 * Documentation: https://nominatim.org/release-docs/latest/api/Search/
 */
export async function geocodeWithNominatim(
  city: string,
  state?: string | null,
  country?: string | null
): Promise<GeocodingResult | null> {
  const cacheKey = getCacheKey(city, state, country);
  
  // Check cache first
  if (cacheKey in geocodingCache) {
    return geocodingCache[cacheKey];
  }

  try {
    const query = [city, state, country].filter(Boolean).join(', ');
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JobPostingsAnalysisApp/1.0',
      },
    });

    if (!response.ok) {
      console.error(`Nominatim HTTP error! status: ${response.status}`);
      geocodingCache[cacheKey] = null;
      return null;
    }

    const data = await response.json();

    if (data && data[0]) {
      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
      geocodingCache[cacheKey] = result;
      return result;
    }

    geocodingCache[cacheKey] = null;
    return null;
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
    geocodingCache[cacheKey] = null;
    return null;
  }
}

/**
 * Geocode using Google Maps Geocoding API (Paid, more accurate)
 * Requires GOOGLE_MAPS_API_KEY in environment
 * Pricing: $5 per 1000 requests, $200/month free credit
 * Documentation: https://developers.google.com/maps/documentation/geocoding
 */
export async function geocodeWithGoogle(
  city: string,
  state?: string | null,
  country?: string | null
): Promise<GeocodingResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn('GOOGLE_MAPS_API_KEY not set');
    return null;
  }

  const cacheKey = getCacheKey(city, state, country);

  // Check cache first
  if (cacheKey in geocodingCache) {
    return geocodingCache[cacheKey];
  }

  try {
    const address = [city, state, country].filter(Boolean).join(', ');
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results[0]) {
      const location = data.results[0].geometry.location;
      const result = {
        lat: location.lat,
        lng: location.lng,
      };
      geocodingCache[cacheKey] = result;
      return result;
    }

    if (data.status === 'ZERO_RESULTS') {
      geocodingCache[cacheKey] = null;
    }

    console.warn(`Google geocoding failed: ${data.status}`);
    return null;
  } catch (error) {
    console.error('Google geocoding error:', error);
    return null;
  }
}

/**
 * Geocode using Mapbox (Alternative paid service)
 * Requires MAPBOX_ACCESS_TOKEN in environment
 * Pricing: 100,000 free requests/month, then $0.75 per 1000
 * Documentation: https://docs.mapbox.com/api/search/geocoding/
 */
export async function geocodeWithMapbox(
  city: string,
  state?: string | null,
  country?: string | null
): Promise<GeocodingResult | null> {
  const accessToken = process.env.MAPBOX_ACCESS_TOKEN;

  if (!accessToken) {
    console.warn('MAPBOX_ACCESS_TOKEN not set');
    return null;
  }

  const cacheKey = getCacheKey(city, state, country);

  if (cacheKey in geocodingCache) {
    return geocodingCache[cacheKey];
  }

  try {
    const query = [city, state, country].filter(Boolean).join(', ');
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query
    )}.json?access_token=${accessToken}&limit=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features[0]) {
      const [lng, lat] = data.features[0].center;
      const result = { lat, lng };
      geocodingCache[cacheKey] = result;
      return result;
    }

    geocodingCache[cacheKey] = null;
    return null;
  } catch (error) {
    console.error('Mapbox geocoding error:', error);
    return null;
  }
}

/**
 * Smart geocoding with fallback strategy
 * Tries services in order: Google → Mapbox → Nominatim
 */
export async function geocodeLocation(
  city: string,
  state?: string | null,
  country?: string | null
): Promise<GeocodingResult | null> {
  // Try Google Maps first (best accuracy)
  if (process.env.GOOGLE_MAPS_API_KEY) {
    const result = await geocodeWithGoogle(city, state, country);
    if (result) return result;
  }

  // Try Mapbox second (good accuracy, generous free tier)
  if (process.env.MAPBOX_ACCESS_TOKEN) {
    const result = await geocodeWithMapbox(city, state, country);
    if (result) return result;
  }

  // Fall back to Nominatim (free, lower rate limits)
  return await geocodeWithNominatim(city, state, country);
}

/**
 * Batch geocode multiple locations with rate limiting
 * Useful for importing many locations at once
 */
export async function batchGeocode(
  locations: Array<{
    city: string;
    state?: string | null;
    country?: string | null;
  }>,
  delayMs: number = 1000
): Promise<Array<GeocodingResult | null>> {
  const results: Array<GeocodingResult | null> = [];

  for (const location of locations) {
    const result = await geocodeLocation(
      location.city,
      location.state,
      location.country
    );
    results.push(result);

    // Rate limiting
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Clear the geocoding cache
 * Useful for testing or memory management
 */
export function clearGeocodingCache(): void {
  Object.keys(geocodingCache).forEach((key) => delete geocodingCache[key]);
}

/**
 * Get cache statistics
 */
export function getGeocodingCacheStats() {
  const entries = Object.entries(geocodingCache);
  return {
    total: entries.length,
    successful: entries.filter(([_, v]) => v !== null).length,
    failed: entries.filter(([_, v]) => v === null).length,
  };
}