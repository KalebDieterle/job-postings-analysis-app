import { db } from '@/db';
import { roleAliases } from '@/db/schema';
import { eq } from 'drizzle-orm';

const cache = new Map<string, string>();

export async function resolveCanonicalRole(titleOrAlias: string) {
  if (cache.has(titleOrAlias)) return cache.get(titleOrAlias)!;

  const result = await db.select({ canonical_name: roleAliases.canonical_name })
    .from(roleAliases)
    .where(eq(roleAliases.alias, titleOrAlias))
    .limit(1);

  const canonical = result.length ? result[0].canonical_name : titleOrAlias;
  cache.set(titleOrAlias, canonical);
  return canonical;
}

export async function getAllAliasesForRole(canonicalName: string) {
  const aliases = await db.select({ alias: roleAliases.alias })
    .from(roleAliases)
    .where(eq(roleAliases.canonical_name, canonicalName));

  return aliases.map(a => a.alias);
}
