import assert from "node:assert/strict";

import { categorizeSkill } from "../lib/skill-categories";
import { generateLocationSlug } from "../lib/location-utils";
import {
  buildAnchoredTimeframeWindow,
  normalizeTimeframeDays,
} from "../lib/timeframe-window";

function runCategoryTests() {
  assert.equal(categorizeSkill("Python"), "Programming Languages");
  assert.equal(categorizeSkill("TensorFlow"), "AI/ML & Data Science");
  assert.equal(categorizeSkill("Obscure Internal Tool"), "Tools & Platforms");
}

function runSlugTests() {
  assert.equal(
    generateLocationSlug("San Francisco", "California", "United States"),
    "san-francisco-ca",
  );
  assert.equal(generateLocationSlug("New York", "NY", "US"), "new-york-ny");
}

function runTimeframeWindowTests() {
  assert.equal(normalizeTimeframeDays(7), 7);
  assert.equal(normalizeTimeframeDays(45), 30);

  const anchor = new Date("2025-12-31T00:00:00.000Z");
  const window = buildAnchoredTimeframeWindow(anchor, 30);

  assert.equal(window.days, 30);
  assert.equal(window.endDate.toISOString(), "2025-12-31T00:00:00.000Z");
  assert.equal(window.startDate.toISOString(), "2025-12-01T00:00:00.000Z");
  assert.equal(
    window.previousStartDate.toISOString(),
    "2025-11-01T00:00:00.000Z",
  );
  assert.equal(window.previousEndDate.toISOString(), "2025-12-01T00:00:00.000Z");
}

function main() {
  runCategoryTests();
  runSlugTests();
  runTimeframeWindowTests();
  console.log("Core helper tests passed.");
}

main();
