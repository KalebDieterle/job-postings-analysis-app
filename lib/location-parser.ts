/**
 * lib/location-parser.ts
 *
 * Robust US location parsing for job posting location strings.
 * Handles formats like:
 *   "New York City, NY"
 *   "San Francisco, California"
 *   "Boston, Suffolk County"
 *   "Greater San Luis Obispo Area"
 *   "United States"
 *   "Remote"
 *   "Tampa, FL"
 */

export interface ParsedLocation {
  city: string | null;
  state: string | null;
}

/** All 50 US states + DC + territories, full name → abbreviation */
const STATE_MAP: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'district of columbia': 'DC',
  'puerto rico': 'PR',
  guam: 'GU',
  'u.s. virgin islands': 'VI',
  'american samoa': 'AS',
};

/** Valid 2-letter abbreviations (for quick validation) */
const VALID_ABBREVS = new Set(Object.values(STATE_MAP));

/** Strings that carry no geographic meaning */
const NON_LOCATION_STRINGS = new Set([
  'remote',
  'united states',
  'usa',
  'us',
  'nationwide',
  'anywhere',
  'various locations',
  'multiple locations',
  'work from home',
  'telecommute',
  'virtual',
  'hybrid',
  'n/a',
  '',
]);

/**
 * Try to resolve a string into a 2-letter state abbreviation.
 * Returns null if the string is not recognisable as a state.
 */
function resolveState(raw: string): string | null {
  const trimmed = raw.trim();

  // Already a 2-letter abbreviation?
  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && VALID_ABBREVS.has(upper)) {
    return upper;
  }

  // Full state name?
  const lower = trimmed.toLowerCase();
  if (STATE_MAP[lower]) {
    return STATE_MAP[lower];
  }

  return null;
}

/**
 * Parse a location string into city and state components.
 *
 * Handles many real-world formats found in job postings:
 *  - "City, ST"  /  "City, State Name"
 *  - "City, County Name"  (county is discarded, state = null)
 *  - "Greater City Area"  (prefix/suffix stripped)
 *  - "Remote" / "United States" / blanks
 *  - "City, ST, US"  (trailing country part dropped)
 *  - "Metropolitan Area"
 */
export function parseJobLocation(location: string | null | undefined): ParsedLocation {
  // ── guard ─────────────────────────────────────────────
  if (!location) return { city: null, state: null };

  const normalized = location.trim();
  if (NON_LOCATION_STRINGS.has(normalized.toLowerCase())) {
    return { city: null, state: null };
  }

  // ── strip "Greater … Area" / "… Metropolitan Area" ───
  let cleaned = normalized
    .replace(/^greater\s+/i, '')
    .replace(/\s+(metro(politan)?\s+)?area$/i, '')
    .trim();

  // ── split on comma ───────────────────────────────────
  const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);

  if (parts.length === 0) {
    return { city: null, state: null };
  }

  // Single token (no comma) — could be just a city or state name
  if (parts.length === 1) {
    const state = resolveState(parts[0]);
    if (state) return { city: null, state };
    return { city: parts[0] || null, state: null };
  }

  // 3+ parts: "City, State, Country" or "City, County, State"
  // Try the LAST part as state first, then second-to-last.
  if (parts.length >= 3) {
    // Drop a trailing country-like token (US / USA / United States)
    const lastLower = parts[parts.length - 1].toLowerCase();
    if (['us', 'usa', 'united states'].includes(lastLower)) {
      parts.pop();
    }
  }

  // Now we have 2+ parts.  Try second part as state.
  const city = parts[0];
  const candidateState = parts[1];

  const state = resolveState(candidateState);
  if (state) {
    return { city, state };
  }

  // Second part might be a county (e.g. "Suffolk County") — discard
  if (/county$/i.test(candidateState)) {
    return { city, state: null };
  }

  // Unrecognised second part — keep city, discard rest
  return { city, state: null };
}

/**
 * Classify a parse result for aggregate reporting.
 */
export function classifyParse(p: ParsedLocation): 'full' | 'partial' | 'none' {
  if (p.city && p.state) return 'full';
  if (p.city || p.state) return 'partial';
  return 'none';
}
