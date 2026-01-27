/**
 * Convert a company name to a URL-safe slug
 * @param text - The company name to slugify
 * @returns URL-safe slug
 * 
 * Examples:
 * - "Amazon.com, Inc." → "amazon-com-inc"
 * - "Lowe's Companies, Inc." → "lowes-companies-inc"
 * - "AT&T" → "att"
 * - "Wells Fargo & Company" → "wells-fargo-company"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters (periods, commas, apostrophes, etc)
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Convert a slug back to a format suitable for database lookup
 * Note: This won't perfectly recreate the original name, but it will work for case-insensitive lookups
 * @param slug - The URL slug
 * @returns String that can be used for case-insensitive database search
 * 
 * Examples:
 * - "amazon-com-inc" → "amazon com inc" (will match "Amazon.com, Inc." in case-insensitive search)
 * - "lowes-companies-inc" → "lowes companies inc" (will match "Lowe's Companies, Inc.")
 * - "att" → "att" (will match "AT&T")
 * 
 * The database query should use: LOWER(company_name) LIKE LOWER('%slug%')
 * or better yet: LOWER(slugify(company_name)) = LOWER(slug)
 */
export function unslugify(slug: string): string {
  // Simply replace hyphens with spaces
  // The database query will handle case-insensitive matching
  return slug.replace(/-/g, ' ');
}

/**
 * Alternative: Slugify for database comparison
 * Use this if you want to create a computed column or index in your database
 * 
 * In PostgreSQL, you could create:
 * CREATE INDEX idx_companies_slug ON companies (
 *   LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^\w\s-]', '', 'g'), '[\s_-]+', '-', 'g'))
 * );
 * 
 * Then search with:
 * WHERE LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^\w\s-]', '', 'g'), '[\s_-]+', '-', 'g')) = LOWER(slug)
 */
export function slugifyForDB(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}