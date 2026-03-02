import { fetchWithTimeout, finalizeRun, getBaseUrl, normalizeStatus } from "./_helpers";
import type { QaCheckResult } from "./_types";

const QUERY_CASES: Array<{ name: string; path: string }> = [
  {
    name: "roles filtering and pagination",
    path: "/roles?q=engineer&location=ca&experience=Entry%20level&minSalary=70000&page=2",
  },
  {
    name: "roles invalid params normalize safely",
    path: "/roles?page=-5&minSalary=-200",
  },
  {
    name: "skills full filter payload",
    path: "/skills?q=python&category=Programming%20Languages&experience=Associate&demandMin=100&demandMax=5000&salaryMin=50000&salaryMax=200000&sort=salary&page=1&view=grid",
  },
  {
    name: "skills out-of-range params normalize safely",
    path: "/skills?page=-1&demandMin=-100&salaryMax=9999999&sort=unknown",
  },
  {
    name: "companies filtering and pagination",
    path: "/companies?q=data&location=US&companySize=11-50,51-200&minSalary=60000&minPostings=3&sort=name&page=2",
  },
  {
    name: "locations filtering and pagination",
    path: "/locations?q=columbus&state=OH&country=US&minSalary=60000&minJobs=5&sort=salary&page=1",
  },
  {
    name: "locations invalid params normalize safely",
    path: "/locations?page=0&minJobs=-1&sort=unknown",
  },
  {
    name: "trends query params",
    path: "/trends?timeframe=7&sortBy=demand",
  },
  {
    name: "trends invalid params normalize safely",
    path: "/trends?timeframe=999&sortBy=invalid",
  },
];

async function main() {
  const startedAt = new Date();
  const checks: QaCheckResult[] = [];
  const baseUrl = getBaseUrl();

  for (const testCase of QUERY_CASES) {
    const response = await fetchWithTimeout(`${baseUrl}${testCase.path}`);
    const passed = response.status >= 200 && response.status < 400;

    checks.push({
      name: testCase.name,
      passed,
      details: `status ${normalizeStatus(response.status)} for ${testCase.path}`,
      severity: passed ? "low" : "medium",
    });
  }

  finalizeRun("qa:smoke-query-params", checks, startedAt);
}

main().catch((error) => {
  console.error("qa:smoke-query-params failed", error);
  process.exit(1);
});

