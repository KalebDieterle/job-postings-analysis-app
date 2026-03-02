import { db } from "../../db";
import { companies } from "../../db/schema";
import { fetchWithTimeout, finalizeRun, getBaseUrl, normalizeStatus } from "./_helpers";
import type { QaCheckResult } from "./_types";

async function main() {
  const startedAt = new Date();
  const checks: QaCheckResult[] = [];
  const baseUrl = getBaseUrl();

  const trendingResponse = await fetchWithTimeout(
    `${baseUrl}/api/trending?timeframe=7&sortBy=demand&limit=10`,
  );
  const trendingPayload = trendingResponse.ok ? await trendingResponse.json() : null;

  checks.push({
    name: "GET /api/trending returns data",
    passed: trendingResponse.status === 200 && Array.isArray(trendingPayload),
    details: `status ${normalizeStatus(trendingResponse.status)}`,
    severity: trendingResponse.status === 200 ? "low" : "high",
  });

  const trendingInvalidResponse = await fetchWithTimeout(
    `${baseUrl}/api/trending?timeframe=999&sortBy=demand`,
  );

  checks.push({
    name: "GET /api/trending rejects invalid timeframe",
    passed: trendingInvalidResponse.status === 400,
    details: `status ${normalizeStatus(trendingInvalidResponse.status)}`,
    severity: trendingInvalidResponse.status === 400 ? "low" : "medium",
  });

  const skillsResponse = await fetchWithTimeout(
    `${baseUrl}/api/skills?page=1&limit=12&search=python`,
  );
  const skillsPayload = skillsResponse.ok ? await skillsResponse.json() : null;

  const skillsShapeValid =
    !!skillsPayload &&
    typeof skillsPayload === "object" &&
    Array.isArray((skillsPayload as { items?: unknown[] }).items);

  checks.push({
    name: "GET /api/skills returns paginated payload",
    passed: skillsResponse.status === 200 && skillsShapeValid,
    details: `status ${normalizeStatus(skillsResponse.status)}`,
    severity: skillsResponse.status === 200 ? "low" : "high",
  });

  const skillsInvalidResponse = await fetchWithTimeout(
    `${baseUrl}/api/skills?page=0&limit=1000`,
  );

  checks.push({
    name: "GET /api/skills rejects invalid bounds",
    passed: skillsInvalidResponse.status === 400,
    details: `status ${normalizeStatus(skillsInvalidResponse.status)}`,
    severity: skillsInvalidResponse.status === 400 ? "low" : "medium",
  });

  const compareInvalidResponse = await fetchWithTimeout(
    `${baseUrl}/api/companies/compare`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyIds: [] }),
    },
  );

  checks.push({
    name: "POST /api/companies/compare validates payload",
    passed: compareInvalidResponse.status === 400,
    details: `status ${normalizeStatus(compareInvalidResponse.status)}`,
    severity: compareInvalidResponse.status === 400 ? "low" : "medium",
  });

  const companyRows = await db
    .select({ companyId: companies.company_id })
    .from(companies)
    .limit(2);

  if (companyRows.length > 0) {
    const compareValidResponse = await fetchWithTimeout(
      `${baseUrl}/api/companies/compare`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyIds: companyRows.map((row) => row.companyId) }),
      },
    );

    const comparePayload = compareValidResponse.ok
      ? await compareValidResponse.json()
      : null;

    checks.push({
      name: "POST /api/companies/compare returns data",
      passed: compareValidResponse.status === 200 && Array.isArray(comparePayload),
      details: `status ${normalizeStatus(compareValidResponse.status)}`,
      severity: compareValidResponse.status === 200 ? "low" : "high",
    });
  } else {
    checks.push({
      name: "POST /api/companies/compare returns data",
      passed: true,
      details: "skipped: no companies available in database",
      severity: "low",
    });
  }

  finalizeRun("qa:smoke-api", checks, startedAt);
}

main().catch((error) => {
  console.error("qa:smoke-api failed", error);
  process.exit(1);
});

