import { db } from '../db';
import { companies } from '../db/schema';
import { isNotNull, eq, and } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import process from 'process';

type Coords = { lat: number; lng: number };

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

function locationKey(city: string, state?: string | null, country?: string | null): string {
  return [
    city,
    state && state !== '0' ? state.toLowerCase().trim() : '',
    country?.toLowerCase().trim() ?? '',
  ].join('|');
}

function splitCsvLine(line: string): string[] {
  const tokens: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' || ch === "'") {
      const quoteChar = ch;
      if (inQuotes && line[i + 1] === quoteChar) {
        cur += quoteChar;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      tokens.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  tokens.push(cur);
  return tokens.map((t) => t.trim());
}

async function loadCache(filePath: string): Promise<Map<string, Coords>> {
  const cache = new Map<string, Coords>();
  if (!fs.existsSync(filePath)) return cache;

  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return cache;

  let start = 1; // skip header
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const tokens = splitCsvLine(line);
    if (tokens.length < 3) continue;

    const latToken = tokens[tokens.length - 2];
    const lngToken = tokens[tokens.length - 1];
    const keyTokens = tokens.slice(0, tokens.length - 2);
    let key = keyTokens.join(',').trim();
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1).trim();
    }

    const lat = Number(latToken);
    const lng = Number(lngToken);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    cache.set(key, { lat, lng });
  }

  return cache;
}

function haversineKm(a: Coords, b: Coords): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const x = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function isValidLat(lat: number | null | undefined): lat is number {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}
function isValidLng(lng: number | null | undefined): lng is number {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const doFix = args.includes('--fix');
  const thresholdArg = args.find((a) => a.startsWith('--threshold='));
  const threshold = thresholdArg ? Number(thresholdArg.split('=')[1]) : 50;

  const scriptDir = path.resolve(__dirname);
  const cachePath = path.resolve(scriptDir, 'location_cache.csv');
  const outPath = path.resolve(scriptDir, 'coord_validation_report.csv');

  console.log(`Loading cache from ${cachePath}`);
  const cache = await loadCache(cachePath);
  console.log(`Loaded ${cache.size} cache entries`);

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
    .where(and(isNotNull(companies.lat), isNotNull(companies.lng)));

  console.log(`Found ${rows.length} companies with lat & lng`);

  type ReportRow = {
    company_id: string;
    city: string;
    state: string;
    company_lat: string;
    company_lng: string;
    cache_lat: string;
    cache_lng: string;
    distance_km: string;
    swapped_distance_km: string;
    issue: string;
  };

  const results: ReportRow[] = [];

  for (const r of rows) {
    const companyId = String(r.id);
    const rawCity = r.city ?? '';
    const normCity = rawCity ? normalizeCity(rawCity) : null;
    const key = normCity ? locationKey(normCity, r.state, r.country) : '';
    const cacheCoords = key ? cache.get(key) ?? null : null;

    const compLat = r.lat;
    const compLng = r.lng;

    let issue = '';
    let distanceKmVal: number | null = null;
    let swappedDistanceKmVal: number | null = null;

    const compLatValid = isValidLat(compLat);
    const compLngValid = isValidLng(compLng);

    if (!compLatValid || !compLngValid) issue = 'invalid_coords';

    if (cacheCoords && compLatValid && compLngValid) {
      const companyCoords: Coords = { lat: compLat, lng: compLng };
      distanceKmVal = haversineKm(companyCoords, cacheCoords);

      const swappedCompanyCoords: Coords = { lat: compLng, lng: compLat };
      swappedDistanceKmVal = haversineKm(swappedCompanyCoords, cacheCoords);

      if (distanceKmVal > threshold) issue = issue ? issue + ';suspicious_distance' : 'suspicious_distance';

      const swappedIsBetter =
        swappedDistanceKmVal <= threshold &&
        distanceKmVal > 0 &&
        swappedDistanceKmVal < distanceKmVal / 3;

      if (swappedIsBetter) issue = issue ? issue + ';likely_swapped' : 'likely_swapped';
    } else if (cacheCoords && (!compLatValid || !compLngValid)) {
      issue = issue ? issue + ';cache_available' : 'invalid_coords;cache_available';
    }

    results.push({
      company_id: companyId,
      city: rawCity,
      state: r.state ?? '',
      company_lat: compLatValid ? String(compLat) : '',
      company_lng: compLngValid ? String(compLng) : '',
      cache_lat: cacheCoords ? String(cacheCoords.lat) : '',
      cache_lng: cacheCoords ? String(cacheCoords.lng) : '',
      distance_km: distanceKmVal !== null ? distanceKmVal.toFixed(3) : '',
      swapped_distance_km: swappedDistanceKmVal !== null ? swappedDistanceKmVal.toFixed(3) : '',
      issue,
    });
  }

  const header = [
    'company_id',
    'city',
    'state',
    'company_lat',
    'company_lng',
    'cache_lat',
    'cache_lng',
    'distance_km',
    'swapped_distance_km',
    'issue',
  ];
  const lines = [header.join(',')];
  for (const r of results) {
    const row = [
      r.company_id,
      r.city.includes(',') || r.city.includes('"') ? `"${r.city.replace(/"/g, '""')}"` : r.city,
      r.state,
      r.company_lat,
      r.company_lng,
      r.cache_lat,
      r.cache_lng,
      r.distance_km,
      r.swapped_distance_km,
      r.issue,
    ];
    lines.push(row.join(','));
  }
  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
  console.log(`Wrote report to ${outPath} (${results.length} rows)`);

  if (doFix) {
    console.log('Applying fixes for rows flagged likely_swapped...');
    const toFix = results.filter((r) => r.issue.includes('likely_swapped'));
    console.log(`Found ${toFix.length} candidate(s) to fix`);

    const batches = chunk(toFix, 50);
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} items)`);
      for (const item of batch) {
        const currentLat = item.company_lat ? Number(item.company_lat) : null;
        const currentLng = item.company_lng ? Number(item.company_lng) : null;
        if (!isValidLat(currentLat) || !isValidLng(currentLng)) {
          console.log(`Skipping ${item.company_id}: non-numeric coords`);
          continue;
        }
        try {
          await db
            .update(companies)
            .set({ lat: currentLng, lng: currentLat })
            .where(eq(companies.company_id, item.company_id));
          console.log(`Fixed ${item.company_id}: swapped ${currentLat},${currentLng} -> ${currentLng},${currentLat}`);
        } catch (err) {
          console.error(`Error fixing ${item.company_id}:`, err);
        }
      }
    }
    console.log('Fixes applied');
  } else {
    console.log('Run with --fix to apply likely_swapped fixes to the database.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });