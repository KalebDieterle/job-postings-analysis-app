import { db } from '../db';
import { companies } from '../db/schema';
import {
  and,
  or,
  isNull,
  isNotNull,
  inArray,
  eq,
} from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

type Coords = { lat: number; lng: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Normalize city names aggressively
 */
function normalizeCity(raw: string): string | null {
  let city = raw
    .toLowerCase()
    .trim()
    .replace(/^\d+\s*/, '') // leading zip codes
    .replace(/\b(area|region)\b/g, '') // "greater X area"
    .replace(/\b(ft|ft\.)\b/g, 'fort')
    .replace(/-?\s*(us|usa|uk|eu)$/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!city || city.length < 2 || ['0', 'remote', 'worldwide', 'global'].includes(city))
    return null;

  return city;
}

/**
 * Canonical cache key
 */
function locationKey(city: string, state?: string | null, country?: string | null): string {
  return [
    city,
    state && state !== '0' ? state.toLowerCase().trim() : '',
    country?.toLowerCase().trim() ?? '',
  ].join('|');
}

/**
 * Nominatim geocoder
 */
async function geocodeLocation(
  city: string,
  state?: string | null,
  country?: string | null
): Promise<Coords | null> {
  const query = [city, state, country].filter(Boolean).join(', ');
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'JobPostingsAnalysisApp/1.0 (contact@yourapp.com)' },
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.[0]) return null;

  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

/**
 * Load cached locations from CSV
 */
async function loadCache(filePath: string): Promise<Map<string, Coords>> {
  const cache = new Map<string, Coords>();
  if (!fs.existsSync(filePath)) return cache;

  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  for (const line of lines) {
    const [key, lat, lng] = line.split(',');
    if (!key || !lat || !lng) continue;
    cache.set(key.trim(), { lat: Number(lat), lng: Number(lng) });
  }
  return cache;
}

async function main() {
  console.log('🧠 Starting optimized company geocoding...\n');

  const cacheFilePath = path.resolve(__dirname, 'location_cache.csv');
  const coordCache = await loadCache(cacheFilePath);
  const negativeCache = new Set<string>();

  console.log(`⚡ Loaded ${coordCache.size} cached locations from CSV`);

  const rows = await db
    .select({
      id: companies.company_id,
      city: companies.city,
      state: companies.state,
      country: companies.country,
      lat: companies.lat,
      lng: companies.lng,
    })
    .from(companies)
    .where(isNotNull(companies.city));

  // Map: locationKey -> Set of company IDs
  const companiesByLocation = new Map<string, Set<string>>();

  for (const r of rows) {
    if (!r.city) continue;

    const city = normalizeCity(r.city);
    if (!city) continue;

    const key = locationKey(city, r.state, r.country);
    if (!companiesByLocation.has(key)) companiesByLocation.set(key, new Set());
    companiesByLocation.get(key)!.add(r.id);

    // Use cached coordinate if available and write to DB immediately
    if (coordCache.has(key) && (r.lat === null || r.lng === null)) {
      const coords = coordCache.get(key)!;
      await db.update(companies)
        .set(coords)
        .where(eq(companies.company_id, r.id));
      console.log(`📝 Cached coords for '${key}' written to DB for company ${r.id}: ${coords.lat}, ${coords.lng}`);
    }
  }

  const locationsToGeocode = [...companiesByLocation.keys()].filter(
    (k) => !coordCache.has(k)
  );

  console.log(`📍 Unique locations: ${companiesByLocation.size}`);
  console.log(`🌐 API calls needed: ${locationsToGeocode.length}\n`);

  for (let i = 0; i < locationsToGeocode.length; i++) {
    const key = locationsToGeocode[i];
    if (negativeCache.has(key)) continue;

    const [city, state, country] = key.split('|');
    console.log(`[${i + 1}/${locationsToGeocode.length}] Geocoding ${city}`);

    const coords = await geocodeLocation(city, state || null, country || null);

    if (coords) {
      coordCache.set(key, coords);

      const ids = Array.from(companiesByLocation.get(key)!); // deduplicate
      await db.update(companies)
        .set(coords)
        .where(
          and(
            inArray(companies.company_id, ids),
            or(isNull(companies.lat), isNull(companies.lng))
          )
        );
      console.log(`📝 API coords for '${key}' written to DB for ${ids.length} companies: ${coords.lat}, ${coords.lng}`);
    } else {
      negativeCache.add(key);
      console.log(`  ❌ Failed`);
    }

    await sleep(1000);
  }

  console.log('\n🎉 Geocoding complete');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
