#!/usr/bin/env tsx
import assert from "assert";
import { normalizeAnnualSalary } from "@/lib/salary-normalization";

function run() {
  const yearly = normalizeAnnualSalary(100000, 140000, "YEARLY", "adzuna");
  assert.equal(yearly.rejected, false);
  assert.equal(yearly.minAnnual, 100000);
  assert.equal(yearly.maxAnnual, 140000);
  assert.equal(yearly.medAnnual, 120000);

  const hourly = normalizeAnnualSalary(50, 70, "HOURLY", "manual");
  assert.equal(hourly.rejected, false);
  assert.equal(hourly.minAnnual, 104000);
  assert.equal(hourly.maxAnnual, 145600);
  assert.equal(hourly.medAnnual, 124800);

  const monthly = normalizeAnnualSalary(8000, 10000, "MONTHLY", "manual");
  assert.equal(monthly.rejected, false);
  assert.equal(monthly.minAnnual, 96000);
  assert.equal(monthly.maxAnnual, 120000);
  assert.equal(monthly.medAnnual, 108000);

  const corruptedHourly = normalizeAnnualSalary(50000, 70000, "HOURLY", "manual");
  assert.equal(corruptedHourly.rejected, false);
  assert.equal(corruptedHourly.minAnnual, 50000);
  assert.equal(corruptedHourly.maxAnnual, 70000);
  assert.equal(corruptedHourly.medAnnual, 60000);

  const outOfBounds = normalizeAnnualSalary(15000, 18000, "YEARLY", "adzuna");
  assert.equal(outOfBounds.rejected, true);
  assert.equal(outOfBounds.minAnnual, null);
  assert.equal(outOfBounds.maxAnnual, null);

  console.log("✅ Salary normalization tests passed");
}

run();
