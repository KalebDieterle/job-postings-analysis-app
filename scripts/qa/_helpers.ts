import type { QaCheckResult, QaRunSummary } from "./_types";

const DEFAULT_TIMEOUT_MS = 20_000;

export function getBaseUrl(): string {
  const candidate = process.env.QA_BASE_URL || process.env.BASE_URL || "http://127.0.0.1:3000";
  return candidate.endsWith("/") ? candidate.slice(0, -1) : candidate;
}

export async function fetchWithTimeout(
  input: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      redirect: init?.redirect ?? "manual",
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function printSummary(summary: QaRunSummary): void {
  console.log(`\n[${summary.suite}] ${summary.passed ? "PASS" : "FAIL"}`);

  for (const check of summary.checks) {
    const status = check.passed ? "PASS" : "FAIL";
    const severity = check.severity ? ` (${check.severity})` : "";
    console.log(`- ${status}${severity}: ${check.name} - ${check.details}`);
  }
}

export function finalizeRun(suite: string, checks: QaCheckResult[], startedAt: Date): QaRunSummary {
  const summary: QaRunSummary = {
    suite,
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    passed: checks.every((check) => check.passed),
    checks,
  };

  printSummary(summary);
  if (!summary.passed) {
    process.exitCode = 1;
  }

  return summary;
}

export function normalizeStatus(status: number): string {
  return `${status}`;
}

