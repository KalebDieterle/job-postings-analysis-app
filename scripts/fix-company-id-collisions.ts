#!/usr/bin/env tsx
/**
 * scripts/fix-company-id-collisions.ts
 *
 * Detects and fixes hash collisions in the company_id_migration_map.
 * Generates unique deterministic IDs for colliding companies using old_id + name.
 *
 * Usage:
 *   tsx scripts/fix-company-id-collisions.ts
 */

import { db } from "../db/index";
import { sql } from "drizzle-orm";
import { createHash } from "crypto";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Generate a unique deterministic ID using old_id + normalized_name
 * This ensures every company gets a unique ID even if names collide
 */
function generateUniqueId(oldId: string, normalizedName: string): string {
  const composite = `${oldId}|${normalizedName}`;
  return createHash("sha256").update(composite).digest("hex").substring(0, 16);
}

interface CollisionGroup {
  new_id: string;
  old_ids: string[];
  names: string[];
  count: number;
}

async function main() {
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  🔧 Company ID Collision Fixer");
  console.log("═══════════════════════════════════════════════════════\n");

  // Step 1: Find all collisions
  console.log("🔍 Step 1/3 — Detecting collisions...");

  const collisions = await db.execute(sql`
    SELECT
      new_id,
      COUNT(*)::int AS count,
      ARRAY_AGG(old_id ORDER BY old_id) AS old_ids,
      ARRAY_AGG(normalized_name ORDER BY normalized_name) AS names
    FROM company_id_migration_map
    GROUP BY new_id
    HAVING COUNT(*) > 1
    ORDER BY count DESC;
  `).then(r => r.rows as unknown as CollisionGroup[]);

  if (collisions.length === 0) {
    console.log("   ✅ No collisions detected!\n");
    process.exit(0);
  }

  const totalAffected = collisions.reduce((sum, c) => sum + c.count, 0);
  console.log(`   Found ${collisions.length} collision groups affecting ${fmt(totalAffected)} companies`);
  console.log("");

  // Step 2: Generate unique IDs for all colliding companies
  console.log("🔄 Step 2/3 — Generating unique IDs...");

  const updates: Array<{ old_id: string; new_id: string; normalized_name: string }> = [];
  const usedIds = new Set<string>();

  // First, collect all non-colliding IDs to avoid creating new collisions
  const allExisting = await db.execute(sql`
    SELECT DISTINCT new_id FROM company_id_migration_map;
  `).then(r => r.rows as Array<{ new_id: string }>);
  
  allExisting.forEach(row => usedIds.add(row.new_id));

  let fixedCount = 0;

  for (const collision of collisions) {
    // For each company in the collision group, generate a unique ID
    for (let i = 0; i < collision.old_ids.length; i++) {
      const oldId = collision.old_ids[i];
      const name = collision.names[i];
      
      let uniqueId = generateUniqueId(oldId, name);
      
      // Ensure no duplicate (extremely unlikely, but check anyway)
      let attempt = 0;
      while (usedIds.has(uniqueId)) {
        attempt++;
        uniqueId = generateUniqueId(`${oldId}-${attempt}`, name);
      }
      
      usedIds.add(uniqueId);
      updates.push({ old_id: oldId, new_id: uniqueId, normalized_name: name });
      fixedCount++;
    }
  }

  console.log(`   Generated ${fmt(fixedCount)} unique IDs`);
  console.log("");

  // Step 3: Update the migration map
  console.log("💾 Step 3/3 — Updating migration map...");

  const BATCH_SIZE = 100;
  const totalBatches = Math.ceil(updates.length / BATCH_SIZE);

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    // Use a CASE statement to update multiple rows with different values
    const whenClauses = batch.map(u => 
      `WHEN old_id = '${u.old_id.replace(/'/g, "''")}' THEN '${u.new_id}'`
    ).join('\n      ');

    await db.execute(sql.raw(`
      UPDATE company_id_migration_map
      SET new_id = CASE
        ${whenClauses}
      END
      WHERE old_id IN (${batch.map(u => `'${u.old_id.replace(/'/g, "''")}'`).join(',')});
    `));

    process.stdout.write(`\r   batch ${batchNum}/${totalBatches}`);
  }

  console.log(""); // newline after progress
  console.log(`   ✓ Updated ${fmt(fixedCount)} mappings`);
  console.log("");

  // Step 4: Verify no collisions remain
  console.log("✅ Step 4/4 — Verifying fix...");

  const remainingCollisions = await db.execute(sql`
    SELECT COUNT(*) AS count
    FROM (
      SELECT new_id, COUNT(*) AS dup_count
      FROM company_id_migration_map
      GROUP BY new_id
      HAVING COUNT(*) > 1
    ) subquery;
  `).then(r => r.rows[0] as { count: number });

  if (remainingCollisions.count > 0) {
    console.error(`   ❌ ERROR: ${remainingCollisions.count} collisions still remain!`);
    process.exit(1);
  }

  console.log("   ✓ All collisions resolved!");
  console.log("");

  console.log("═══════════════════════════════════════════════════════");
  console.log("  🎉 Collision Fix Complete!");
  console.log("");
  console.log(`  Fixed: ${fmt(fixedCount)} company IDs`);
  console.log(`  Collision groups eliminated: ${collisions.length}`);
  console.log("");
  console.log("  Next steps:");
  console.log("    npm run verify:company-id-map");
  console.log("═══════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("\n💥 Fatal error:", err);
  process.exit(1);
});
