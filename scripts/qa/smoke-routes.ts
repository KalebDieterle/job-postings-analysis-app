import { fetchWithTimeout, finalizeRun, getBaseUrl, normalizeStatus } from "./_helpers";
import type { QaCheckResult } from "./_types";

const PUBLIC_ROUTES = [
  "/",
  "/roles",
  "/skills",
  "/companies",
  "/locations",
  "/trends",
  "/intelligence",
];

const INVALID_DYNAMIC_ROUTES = [
  "/roles/__qa_invalid_slug__",
  "/skills/__qa_invalid_slug__",
  "/companies/__qa_invalid_slug__",
  "/locations/__qa_invalid_slug__",
];

async function main() {
  const startedAt = new Date();
  const checks: QaCheckResult[] = [];
  const baseUrl = getBaseUrl();

  for (const route of PUBLIC_ROUTES) {
    const response = await fetchWithTimeout(`${baseUrl}${route}`);
    const passed = response.status >= 200 && response.status < 400;

    checks.push({
      name: `Route reachable: ${route}`,
      passed,
      details: `status ${normalizeStatus(response.status)}`,
      severity: passed ? "low" : "high",
    });
  }

  for (const route of INVALID_DYNAMIC_ROUTES) {
    const response = await fetchWithTimeout(`${baseUrl}${route}`);
    const bodyText = await response.text();
    const isSoft404 =
      response.status === 200 &&
      bodyText.toLowerCase().includes("this page could not be found");
    const passed = response.status === 404 || isSoft404;

    checks.push({
      name: `Invalid slug returns 404: ${route}`,
      passed,
      details: isSoft404
        ? `status ${normalizeStatus(response.status)} (soft-404 content detected)`
        : `status ${normalizeStatus(response.status)}`,
      severity: passed ? "low" : "medium",
    });
  }

  finalizeRun("qa:smoke-routes", checks, startedAt);
}

main().catch((error) => {
  console.error("qa:smoke-routes failed", error);
  process.exit(1);
});

