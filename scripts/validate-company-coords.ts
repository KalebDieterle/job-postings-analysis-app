import { db } from '../db';
import { companies } from '../db/schema';
import { isNotNull, isNull, eq, and, or } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import process from 'process';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

type Coords = { lat: number; lng: number };

interface CompanyRow {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
}

interface CorrectionRecord {
  company_id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  old_lat: string;
  old_lng: string;
  new_lat: string;
  new_lng: string;
  issue: string;
  matched_reference: string;
  distance_before_km: string;
  distance_after_km: string;
}

// ═══════════════════════════════════════════════════════════════
// Reference Dataset — correct decimal coordinates per standard
// geographic conventions:
//
//   Latitude:  North = positive,  South = negative
//   Longitude: East  = positive,  West  = negative
//
// These are NOT arbitrary — they follow the universal signed
// decimal degree convention used by every major geocoding API
// (Google, Nominatim, Mapbox, etc.).
//
//   Chicago:  41.88°N, 87.63°W  → ( 41.8781, -87.6298)
//   London:   51.51°N,  0.13°W  → ( 51.5074,  -0.1278)
//   Sydney:   33.87°S, 151.21°E → (-33.8688, 151.2093)
// ═══════════════════════════════════════════════════════════════

const REFERENCE_CITIES: Record<string, Coords> = {
  'chicago':       { lat:  41.8781, lng:  -87.6298 },
  'london':        { lat:  51.5074, lng:   -0.1278 },
  'sydney':        { lat: -33.8688, lng:  151.2093 },
  'new york':      { lat:  40.7128, lng:  -74.0060 },
  'los angeles':   { lat:  34.0522, lng: -118.2437 },
  'paris':         { lat:  48.8566, lng:    2.3522 },
  'tokyo':         { lat:  35.6762, lng:  139.6503 },
  'berlin':        { lat:  52.5200, lng:   13.4050 },
  'toronto':       { lat:  43.6532, lng:  -79.3832 },
  'mumbai':        { lat:  19.0760, lng:   72.8777 },
  'san francisco': { lat:  37.7749, lng: -122.4194 },
  'seattle':       { lat:  47.6062, lng: -122.3321 },
  'boston':         { lat:  42.3601, lng:  -71.0589 },
  'austin':        { lat:  30.2672, lng:  -97.7431 },
  'denver':        { lat:  39.7392, lng: -104.9903 },
  'atlanta':       { lat:  33.7490, lng:  -84.3880 },
  'dallas':        { lat:  32.7767, lng:  -96.7970 },
  'houston':       { lat:  29.7604, lng:  -95.3698 },
  'washington':    { lat:  38.9072, lng:  -77.0369 },
  'singapore':     { lat:   1.3521, lng:  103.8198 },
  'dublin':        { lat:  53.3498, lng:   -6.2603 },
  'bangalore':     { lat:  12.9716, lng:   77.5946 },
  'amsterdam':     { lat:  52.3676, lng:    4.9041 },
};

/** Max km distance between a candidate fix and reference to accept it */
const MAX_CORRECTION_DIST_KM = 50;

/** Distance above which a stored coord is flagged as suspicious */
const SUSPICIOUS_DIST_KM = 50;

/** Re-geocoding distance threshold — if stored coord is this far from
 *  reference and no simple sign/swap fix works, try re-geocoding */
const REGEOCODE_DIST_KM = 200;

/** Rate-limit delay between Nominatim API requests (ms) */
const NOMINATIM_DELAY_MS = 1100;

// ═══════════════════════════════════════════════════════════════
// Utility helpers
// ═══════════════════════════════════════════════════════════════

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normalizeCity(raw: string): string | null {
  const city = raw
    .toLowerCase()
    .trim()
    .replace(/^\d+\s*/, '')
    .replace(/\b(greater|area|region|metro|metropolitan)\b/g, '')
    .replace(/\b(ft|ft\.)\b/g, 'fort')
    .replace(/-?\s*(us|usa|uk|eu)$/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[,.]$/, '')
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
  return R * (2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

function isValidLat(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= -90 && v <= 90;
}

function isValidLng(v: number | null | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= -180 && v <= 180;
}

// ═══════════════════════════════════════════════════════════════
// normalizeCoordinates
//
// Per spec: validate ranges, detect swaps, detect sign inversions
// relative to a reference point, and return corrected values with
// human-readable explanations.
//
// This function does NOT blindly flip signs based on hemisphere.
// It only corrects when it can verify the fix against a known
// reference or when the raw values are mathematically invalid.
// ═══════════════════════════════════════════════════════════════

interface NormalizeResult {
  lat: number;
  lng: number;
  corrected: boolean;
  reasons: string[];
}

function normalizeCoordinates(
  lat: number,
  lng: number,
  ref?: Coords | null,
): NormalizeResult {
  const reasons: string[] = [];
  let corrected = false;

  // ── Step 1: Detect obvious lat/lng swap ────────────────────
  // If |lat| > 90 but |lng| ≤ 90 they are almost certainly swapped
  if ((lat < -90 || lat > 90) && lng >= -90 && lng <= 90) {
    reasons.push(`lat/lng swapped: (${lat}, ${lng}) → (${lng}, ${lat})`);
    [lat, lng] = [lng, lat];
    corrected = true;
  }

  // ── Step 2: Still out of range after swap? → invalid ───────
  if (lat < -90 || lat > 90) {
    reasons.push(`lat ${lat} out of valid range [-90, 90]`);
  }
  if (lng < -180 || lng > 180) {
    reasons.push(`lng ${lng} out of valid range [-180, 180]`);
  }

  // ── Step 3: If we have a reference, check sign inversions ──
  if (ref && isValidLat(lat) && isValidLng(lng)) {
    const current: Coords = { lat, lng };
    const directDist = haversineKm(current, ref);

    if (directDist > MAX_CORRECTION_DIST_KM) {
      // Try candidate fixes and pick the best one
      const candidates: { lat: number; lng: number; label: string }[] = [
        { lat: -lat, lng,       label: 'lat sign flipped' },
        { lat,       lng: -lng, label: 'lng sign flipped' },
        { lat: -lat, lng: -lng, label: 'both signs flipped' },
      ];

      // Swap variants
      if (isValidLat(lng)) {
        candidates.push(
          { lat: lng,  lng: lat,  label: 'lat/lng swapped' },
          { lat: -lng, lng: lat,  label: 'swapped + lat flipped' },
          { lat: lng,  lng: -lat, label: 'swapped + lng flipped' },
        );
      }

      let bestDist = directDist;
      let bestFix: { lat: number; lng: number; label: string } | null = null;

      for (const c of candidates) {
        if (!isValidLat(c.lat) || !isValidLng(c.lng)) continue;
        const d = haversineKm(c, ref);
        if (d <= MAX_CORRECTION_DIST_KM && d < bestDist * 0.5) {
          if (!bestFix || d < bestDist) {
            bestDist = d;
            bestFix = c;
          }
        }
      }

      if (bestFix) {
        reasons.push(
          `${bestFix.label}: (${lat}, ${lng}) → (${bestFix.lat}, ${bestFix.lng})` +
          ` [dist ${directDist.toFixed(1)} → ${bestDist.toFixed(1)} km vs ref]`,
        );
        lat = bestFix.lat;
        lng = bestFix.lng;
        corrected = true;
      }
    }
  }

  return { lat, lng, corrected, reasons };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ═══════════════════════════════════════════════════════════════
// Reference-city matching
// ═══════════════════════════════════════════════════════════════

function findReferenceMatch(cityRaw: string): { refName: string; refCoords: Coords } | null {
  const norm = normalizeCity(cityRaw);
  if (!norm) return null;

  // Exact match
  if (REFERENCE_CITIES[norm]) return { refName: norm, refCoords: REFERENCE_CITIES[norm] };

  // Substring match (e.g. "new york city" → "new york")
  for (const [refName, refCoords] of Object.entries(REFERENCE_CITIES)) {
    if (norm.includes(refName) || refName.includes(norm)) {
      return { refName, refCoords };
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// Re-geocoding via Nominatim
//
// Used as last resort when:
//  – stored coords are far from reference
//  – no simple sign/swap fix brings them within tolerance
//  – e.g. a company "in Chicago" was geocoded to Michigan
// ═══════════════════════════════════════════════════════════════

async function geocodeViaNominatim(
  city: string,
  state?: string | null,
  country?: string | null,
): Promise<{ coords: Coords; rawResponse: string } | null> {
  const query = [city, state, country].filter(Boolean).join(', ');
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

  console.log(`      🌐 Nominatim query: "${query}"`);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'JobPostingsAnalysisApp/1.0 (coord-validation)' },
    });

    if (!res.ok) {
      console.log(`      ❌ Nominatim HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const rawResponse = JSON.stringify(data[0] ?? null);

    if (!data?.[0]) {
      console.log('      ❌ Nominatim: no results');
      return null;
    }

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);

    console.log(`      📍 Nominatim raw response: lat=${data[0].lat}, lon=${data[0].lon}`);
    console.log(`      📍 Parsed: (${lat}, ${lng})`);

    if (!isValidLat(lat) || !isValidLng(lng)) {
      console.log('      ❌ Nominatim returned out-of-range coords');
      return null;
    }

    return { coords: { lat, lng }, rawResponse };
  } catch (err) {
    console.error('      ❌ Nominatim error:', err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// CSV helpers
// ═══════════════════════════════════════════════════════════════

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function writeCsv(filePath: string, header: string[], rows: Record<string, string>[]): void {
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(header.map((h) => csvEscape(row[h] ?? '')).join(','));
  }
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

function splitCsvLine(line: string): string[] {
  const tokens: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' || ch === "'") {
      if (inQuotes && line[i + 1] === ch) { cur += ch; i++; }
      else inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) { tokens.push(cur); cur = ''; continue; }
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
  if (lines.length <= 1) return cache;

  for (let i = 1; i < lines.length; i++) {
    const tokens = splitCsvLine(lines[i]);
    if (tokens.length < 3) continue;

    const latToken = tokens[tokens.length - 2];
    const lngToken = tokens[tokens.length - 1];
    let key = tokens.slice(0, tokens.length - 2).join(',').trim();
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'")))
      key = key.slice(1, -1).trim();

    const lat = Number(latToken);
    const lng = Number(lngToken);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    cache.set(key, { lat, lng });
  }
  return cache;
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const doApply    = args.includes('--apply') || args.includes('--fix');
  const doRegeocode = !args.includes('--no-regeocode');   // on by default
  const dryRun     = !doApply;
  const mode       = doApply ? 'APPLY' : 'DRY-RUN';

  const scriptDir       = path.resolve(__dirname);
  const cachePath       = path.resolve(scriptDir, 'location_cache.csv');
  const reportPath      = path.resolve(scriptDir, 'coord_validation_report.csv');
  const correctionsPath = path.resolve(scriptDir, 'coord_corrections.csv');

  console.log('══════════════════════════════════════════════════════');
  console.log(`  Coordinate Validation — Mode: ${mode}`);
  console.log(`  Re-geocoding: ${doRegeocode ? 'ON' : 'OFF (--no-regeocode)'}`);
  console.log('══════════════════════════════════════════════════════\n');

  // ─── Load supporting data ──────────────────────────────────
  console.log(`📂  Loading location cache from ${cachePath}`);
  const cache = await loadCache(cachePath);
  console.log(`    ${cache.size} cache entries loaded`);
  console.log(`📍  Reference cities: ${Object.keys(REFERENCE_CITIES).length}\n`);

  // ─── Fetch all companies WITH coords ───────────────────────
  console.log('🔍  Querying companies with lat & lng …');
  const rowsWithCoords: CompanyRow[] = await db
    .select({
      id: companies.company_id, name: companies.name,
      city: companies.city, state: companies.state, country: companies.country,
      lat: companies.lat, lng: companies.lng,
    })
    .from(companies)
    .where(and(isNotNull(companies.lat), isNotNull(companies.lng)));

  console.log(`    ${rowsWithCoords.length} companies with coordinates\n`);

  // ─── Fetch companies WITHOUT coords (for gap-fill) ─────────
  console.log('🔍  Querying companies missing coordinates …');
  const rowsMissing: CompanyRow[] = await db
    .select({
      id: companies.company_id, name: companies.name,
      city: companies.city, state: companies.state, country: companies.country,
      lat: companies.lat, lng: companies.lng,
    })
    .from(companies)
    .where(
      and(
        isNotNull(companies.city),
        or(isNull(companies.lat), isNull(companies.lng)),
      ),
    );

  console.log(`    ${rowsMissing.length} companies missing coordinates\n`);

  // ─── Counters ──────────────────────────────────────────────
  let totalScanned      = 0;
  let totalCorrected    = 0;
  let totalRegeocoded   = 0;
  let totalApplied      = 0;
  let totalFlaggedOnly  = 0;
  let totalUnchanged    = 0;
  let totalOutOfRange   = 0;
  let totalGapFilled    = 0;
  let totalSkipped      = 0;

  const corrections: CorrectionRecord[] = [];
  const reportRows:  CorrectionRecord[] = [];

  const CSV_HEADER: (keyof CorrectionRecord)[] = [
    'company_id', 'name', 'city', 'state', 'country',
    'old_lat', 'old_lng', 'new_lat', 'new_lng',
    'issue', 'matched_reference', 'distance_before_km', 'distance_after_km',
  ];

  // ═════════════════════════════════════════════════════════════
  // Phase 1: Validate existing coordinates
  // ═════════════════════════════════════════════════════════════

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Phase 1 — Validating existing coordinates');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const row of rowsWithCoords) {
    totalScanned++;
    const rawCity = row.city ?? '';
    const compLat = row.lat;
    const compLng = row.lng;

    // ── Basic range check ────────────────────────────────────
    if (!isValidLat(compLat) || !isValidLng(compLng)) {
      totalOutOfRange++;
      reportRows.push({
        company_id: row.id, name: row.name, city: rawCity,
        state: row.state ?? '', country: row.country ?? '',
        old_lat: String(compLat ?? ''), old_lng: String(compLng ?? ''),
        new_lat: '', new_lng: '',
        issue: 'out_of_range',
        matched_reference: '', distance_before_km: '', distance_after_km: '',
      });
      continue;
    }

    const stored: Coords = { lat: compLat, lng: compLng };

    // ── Try reference-city match ─────────────────────────────
    const ref = rawCity ? findReferenceMatch(rawCity) : null;

    if (ref) {
      const norm = normalizeCoordinates(compLat, compLng, ref.refCoords);
      const distBefore = haversineKm(stored, ref.refCoords);

      if (norm.corrected) {
        const distAfter = haversineKm({ lat: norm.lat, lng: norm.lng }, ref.refCoords);

        console.log(`  🔴  ${row.id}  "${row.name}"  city=${rawCity}`);
        console.log(`      Reference : ${ref.refName} → (${ref.refCoords.lat}, ${ref.refCoords.lng})`);
        console.log(`      Stored    : (${compLat}, ${compLng})`);
        console.log(`      Corrected : (${norm.lat}, ${norm.lng})`);
        console.log(`      Reasons   : ${norm.reasons.join('; ')}`);
        console.log(`      Distance  : ${distBefore.toFixed(1)} km → ${distAfter.toFixed(1)} km\n`);

        totalCorrected++;
        const rec: CorrectionRecord = {
          company_id: row.id, name: row.name, city: rawCity,
          state: row.state ?? '', country: row.country ?? '',
          old_lat: String(compLat), old_lng: String(compLng),
          new_lat: String(norm.lat), new_lng: String(norm.lng),
          issue: norm.reasons.join('; '),
          matched_reference: `ref:${ref.refName}`,
          distance_before_km: distBefore.toFixed(3),
          distance_after_km: distAfter.toFixed(3),
        };
        corrections.push(rec);
        reportRows.push(rec);
        continue;
      }

      // No sign/swap fix worked — check if we should re-geocode
      if (distBefore > REGEOCODE_DIST_KM && doRegeocode) {
        console.log(`  🟠  ${row.id}  "${row.name}"  city=${rawCity}  — ${distBefore.toFixed(0)} km from ref, attempting re-geocode`);

        const geo = await geocodeViaNominatim(rawCity, row.state, row.country);
        await sleep(NOMINATIM_DELAY_MS);

        if (geo) {
          const distAfterGeo = haversineKm(geo.coords, ref.refCoords);
          if (distAfterGeo <= MAX_CORRECTION_DIST_KM) {
            console.log(`      ✅ Re-geocoded: (${geo.coords.lat}, ${geo.coords.lng}) — ${distAfterGeo.toFixed(1)} km from ref\n`);

            totalRegeocoded++;
            const rec: CorrectionRecord = {
              company_id: row.id, name: row.name, city: rawCity,
              state: row.state ?? '', country: row.country ?? '',
              old_lat: String(compLat), old_lng: String(compLng),
              new_lat: String(geo.coords.lat), new_lng: String(geo.coords.lng),
              issue: `regeocoded (was ${distBefore.toFixed(0)}km from ref)`,
              matched_reference: `ref:${ref.refName}`,
              distance_before_km: distBefore.toFixed(3),
              distance_after_km: distAfterGeo.toFixed(3),
            };
            corrections.push(rec);
            reportRows.push(rec);
            continue;
          } else {
            console.log(`      ⚠️  Re-geocoded result still ${distAfterGeo.toFixed(0)} km away — skipping\n`);
          }
        }

        totalFlaggedOnly++;
        reportRows.push({
          company_id: row.id, name: row.name, city: rawCity,
          state: row.state ?? '', country: row.country ?? '',
          old_lat: String(compLat), old_lng: String(compLng),
          new_lat: '', new_lng: '',
          issue: `suspicious_far_from_ref (${distBefore.toFixed(0)}km)`,
          matched_reference: `ref:${ref.refName}`,
          distance_before_km: distBefore.toFixed(3), distance_after_km: '',
        });
        continue;
      }

      // Close enough or re-geocode disabled
      totalUnchanged++;
      continue;
    }

    // ── Fallback: compare against location cache ─────────────
    const normCity = rawCity ? normalizeCity(rawCity) : null;
    const key      = normCity ? locationKey(normCity, row.state, row.country) : '';
    const cacheCo  = key ? cache.get(key) ?? null : null;

    if (cacheCo) {
      const norm = normalizeCoordinates(compLat, compLng, cacheCo);
      const distBefore = haversineKm(stored, cacheCo);

      if (norm.corrected) {
        const distAfter = haversineKm({ lat: norm.lat, lng: norm.lng }, cacheCo);

        console.log(`  🟡  ${row.id}  "${row.name}"  city=${rawCity}  [cache]`);
        console.log(`      Cache     : (${cacheCo.lat}, ${cacheCo.lng})`);
        console.log(`      Stored    : (${compLat}, ${compLng})`);
        console.log(`      Corrected : (${norm.lat}, ${norm.lng})`);
        console.log(`      Reasons   : ${norm.reasons.join('; ')}`);
        console.log(`      Distance  : ${distBefore.toFixed(1)} km → ${distAfter.toFixed(1)} km\n`);

        totalCorrected++;
        const rec: CorrectionRecord = {
          company_id: row.id, name: row.name, city: rawCity,
          state: row.state ?? '', country: row.country ?? '',
          old_lat: String(compLat), old_lng: String(compLng),
          new_lat: String(norm.lat), new_lng: String(norm.lng),
          issue: norm.reasons.join('; '),
          matched_reference: `cache:${key}`,
          distance_before_km: distBefore.toFixed(3),
          distance_after_km: distAfter.toFixed(3),
        };
        corrections.push(rec);
        reportRows.push(rec);
      } else if (distBefore > SUSPICIOUS_DIST_KM) {
        totalFlaggedOnly++;
        reportRows.push({
          company_id: row.id, name: row.name, city: rawCity,
          state: row.state ?? '', country: row.country ?? '',
          old_lat: String(compLat), old_lng: String(compLng),
          new_lat: '', new_lng: '',
          issue: 'suspicious_distance_no_fix',
          matched_reference: `cache:${key}`,
          distance_before_km: distBefore.toFixed(3), distance_after_km: '',
        });
      } else {
        totalUnchanged++;
      }
    } else {
      totalUnchanged++;
    }
  }

  // ═════════════════════════════════════════════════════════════
  // Phase 2: Fill missing coordinates (gap-fill)
  // ═════════════════════════════════════════════════════════════

  if (doRegeocode && rowsMissing.length > 0) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Phase 2 — Filling missing coordinates');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Limit gap-fill to a reasonable batch to avoid Nominatim rate issues
    const gapFillBatch = rowsMissing.slice(0, 100);
    console.log(`  Processing up to ${gapFillBatch.length} of ${rowsMissing.length} missing records\n`);

    for (const row of gapFillBatch) {
      const rawCity = row.city ?? '';
      if (!rawCity) { totalSkipped++; continue; }

      // Check if cache has coords for this location
      const normCity = normalizeCity(rawCity);
      const key = normCity ? locationKey(normCity, row.state, row.country) : '';
      const cacheCo = key ? cache.get(key) ?? null : null;

      if (cacheCo) {
        console.log(`  📌  ${row.id}  "${row.name}"  city=${rawCity} → from cache (${cacheCo.lat}, ${cacheCo.lng})`);
        totalGapFilled++;
        corrections.push({
          company_id: row.id, name: row.name, city: rawCity,
          state: row.state ?? '', country: row.country ?? '',
          old_lat: '', old_lng: '',
          new_lat: String(cacheCo.lat), new_lng: String(cacheCo.lng),
          issue: 'gap_fill_from_cache',
          matched_reference: `cache:${key}`,
          distance_before_km: '', distance_after_km: '',
        });
        continue;
      }

      // No cache — try re-geocoding
      const geo = await geocodeViaNominatim(rawCity, row.state, row.country);
      await sleep(NOMINATIM_DELAY_MS);

      if (geo) {
        // Sanity-check against reference if available
        const ref = findReferenceMatch(rawCity);
        if (ref) {
          const dist = haversineKm(geo.coords, ref.refCoords);
          if (dist > REGEOCODE_DIST_KM) {
            console.log(`      ⚠️  Geocoded (${geo.coords.lat}, ${geo.coords.lng}) is ${dist.toFixed(0)}km from ref ${ref.refName} — skipping`);
            totalSkipped++;
            continue;
          }
        }

        console.log(`  📌  ${row.id}  "${row.name}"  city=${rawCity} → geocoded (${geo.coords.lat}, ${geo.coords.lng})`);
        totalGapFilled++;
        corrections.push({
          company_id: row.id, name: row.name, city: rawCity,
          state: row.state ?? '', country: row.country ?? '',
          old_lat: '', old_lng: '',
          new_lat: String(geo.coords.lat), new_lng: String(geo.coords.lng),
          issue: 'gap_fill_geocoded',
          matched_reference: ref ? `ref:${ref.refName}` : '',
          distance_before_km: '', distance_after_km: '',
        });
      } else {
        totalSkipped++;
      }
    }
  }

  // ═════════════════════════════════════════════════════════════
  // Phase 3: Write CSV reports
  // ═════════════════════════════════════════════════════════════

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Phase 3 — Writing CSV reports');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  writeCsv(reportPath, CSV_HEADER as string[], reportRows as unknown as Record<string, string>[]);
  console.log(`  📄  Full report        → ${reportPath}  (${reportRows.length} rows)`);

  if (corrections.length > 0) {
    writeCsv(correctionsPath, CSV_HEADER as string[], corrections as unknown as Record<string, string>[]);
    console.log(`  📄  Corrections        → ${correctionsPath}  (${corrections.length} rows)`);
  }

  // ═════════════════════════════════════════════════════════════
  // Phase 4: Apply / preview
  // ═════════════════════════════════════════════════════════════

  if (corrections.length === 0) {
    console.log('\n  ✅  No corrections needed — all coordinates look good!');
  } else if (dryRun) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Phase 4 — DRY-RUN preview (no DB changes)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (const c of corrections) {
      const before = c.old_lat && c.old_lng
        ? `(${c.old_lat}, ${c.old_lng})`
        : '(none)';
      console.log(
        `  📝  ${c.company_id}  "${c.name}"  (${c.city})` +
        `  ${before} → (${c.new_lat}, ${c.new_lng})  [${c.issue}]`,
      );
    }
    console.log(`\n  ➡️   Run with --apply to commit ${corrections.length} correction(s) to the database.\n`);
  } else {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  Phase 4 — Applying corrections to database');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const batches = chunk(corrections, 50);
    for (let bi = 0; bi < batches.length; bi++) {
      const batch = batches[bi];
      console.log(`  Batch ${bi + 1}/${batches.length}  (${batch.length} records)`);

      for (const item of batch) {
        const newLat = Number(item.new_lat);
        const newLng = Number(item.new_lng);

        if (!isValidLat(newLat) || !isValidLng(newLng)) {
          console.log(`    ⏭️   Skip ${item.company_id}: corrected coords out of valid range`);
          totalSkipped++;
          continue;
        }

        try {
          await db
            .update(companies)
            .set({ lat: newLat, lng: newLng })
            .where(eq(companies.company_id, item.company_id));

          totalApplied++;
          const before = item.old_lat && item.old_lng
            ? `(${item.old_lat}, ${item.old_lng})`
            : '(none)';
          console.log(
            `    ✅  ${item.company_id}  "${item.name}"  (${item.city}): ` +
            `${before} → (${item.new_lat}, ${item.new_lng})  [${item.issue}]`,
          );
        } catch (err) {
          console.error(`    ❌  Error fixing ${item.company_id}:`, err);
        }
      }
    }
  }

  // ═════════════════════════════════════════════════════════════
  // Summary
  // ═════════════════════════════════════════════════════════════

  console.log('\n══════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  Total scanned           : ${totalScanned}`);
  console.log(`  Corrected (sign/swap)   : ${totalCorrected}`);
  console.log(`  Re-geocoded             : ${totalRegeocoded}`);
  console.log(`  Gap-filled (missing)    : ${totalGapFilled}`);
  console.log(`  Applied to DB           : ${totalApplied}`);
  console.log(`  Flagged (no auto-fix)   : ${totalFlaggedOnly}`);
  console.log(`  Out-of-range            : ${totalOutOfRange}`);
  console.log(`  Skipped                 : ${totalSkipped}`);
  console.log(`  Unchanged / OK          : ${totalUnchanged}`);
  console.log(`  Mode                    : ${mode}`);
  console.log('══════════════════════════════════════════════════════\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
