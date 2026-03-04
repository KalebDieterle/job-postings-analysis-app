export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import {
  buildMlUpstreamHeaders,
  getMlServiceUrl,
  logMlProxyResult,
  proxyUpstreamError,
  runMlProxyGuards,
} from "@/lib/ml/proxy-utils";

const ROUTE = "/api/ml/salary/predict";
const MAX_TITLE_LENGTH = 120;
const MAX_LOCATION_LENGTH = 120;
const MAX_COUNTRY_LENGTH = 3;
const MAX_EXPERIENCE_LEVEL_LENGTH = 40;
const MAX_WORK_TYPE_LENGTH = 40;
const MAX_COMPANY_SCALE_TIER_LENGTH = 40;
const MAX_ARRAY_ITEMS = 50;
const MAX_ARRAY_ITEM_LENGTH = 64;
const MAX_EMPLOYEE_COUNT = 1_000_000_000;

interface ValidationIssue {
  field: string;
  message: string;
}

interface SalaryPredictRequestPayload {
  title: string;
  location?: string;
  country?: string;
  experience_level?: string;
  work_type?: string;
  remote_allowed?: boolean | null;
  skills: string[];
  industries: string[];
  employee_count?: number | null;
  company_scale_tier?: string | null;
}

type ValidationResult =
  | { ok: true; payload: SalaryPredictRequestPayload }
  | { ok: false; issues: ValidationIssue[] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateOptionalStringField(
  value: unknown,
  field: string,
  maxLength: number,
  issues: ValidationIssue[],
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    issues.push({ field, message: `${field} must be a string.` });
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    issues.push({
      field,
      message: `${field} must be ${maxLength} characters or fewer.`,
    });
    return undefined;
  }

  return trimmed;
}

function validateStringArrayField(
  value: unknown,
  field: "skills" | "industries",
  issues: ValidationIssue[],
): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    issues.push({ field, message: `${field} must be an array of strings.` });
    return [];
  }
  if (value.length > MAX_ARRAY_ITEMS) {
    issues.push({
      field,
      message: `${field} must have ${MAX_ARRAY_ITEMS} items or fewer.`,
    });
    return [];
  }

  const normalized: string[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (typeof item !== "string") {
      issues.push({
        field,
        message: `${field}[${index}] must be a string.`,
      });
      continue;
    }

    const trimmed = item.trim();
    if (trimmed.length === 0) {
      issues.push({
        field,
        message: `${field}[${index}] cannot be empty.`,
      });
      continue;
    }
    if (trimmed.length > MAX_ARRAY_ITEM_LENGTH) {
      issues.push({
        field,
        message: `${field}[${index}] must be ${MAX_ARRAY_ITEM_LENGTH} characters or fewer.`,
      });
      continue;
    }

    normalized.push(trimmed);
  }

  return normalized;
}

function createValidationResponse(issues: ValidationIssue[]): NextResponse {
  return NextResponse.json(
    {
      error: "invalid_request",
      message: "Request validation failed.",
      issues,
    },
    { status: 400 },
  );
}

function validatePredictRequestBody(body: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!isPlainObject(body)) {
    return {
      ok: false,
      issues: [{ field: "body", message: "Request body must be a JSON object." }],
    };
  }

  let title = "";
  if (typeof body.title !== "string") {
    issues.push({ field: "title", message: "title is required and must be a string." });
  } else {
    title = body.title.trim();
    if (!title) {
      issues.push({ field: "title", message: "title is required." });
    } else if (title.length > MAX_TITLE_LENGTH) {
      issues.push({
        field: "title",
        message: `title must be ${MAX_TITLE_LENGTH} characters or fewer.`,
      });
    }
  }

  const location = validateOptionalStringField(
    body.location,
    "location",
    MAX_LOCATION_LENGTH,
    issues,
  );
  const country = validateOptionalStringField(
    body.country,
    "country",
    MAX_COUNTRY_LENGTH,
    issues,
  );
  if (country && !/^[a-z]{2,3}$/i.test(country)) {
    issues.push({
      field: "country",
      message: "country must be a 2-3 letter code (for example: us, gb, ca).",
    });
  }

  const experienceLevel = validateOptionalStringField(
    body.experience_level,
    "experience_level",
    MAX_EXPERIENCE_LEVEL_LENGTH,
    issues,
  );

  const workType = validateOptionalStringField(
    body.work_type,
    "work_type",
    MAX_WORK_TYPE_LENGTH,
    issues,
  );

  const remoteAllowedRaw = body.remote_allowed;
  if (
    remoteAllowedRaw !== undefined &&
    remoteAllowedRaw !== null &&
    typeof remoteAllowedRaw !== "boolean"
  ) {
    issues.push({
      field: "remote_allowed",
      message: "remote_allowed must be true, false, or null.",
    });
  }

  const skills = validateStringArrayField(body.skills, "skills", issues);
  const industries = validateStringArrayField(body.industries, "industries", issues);

  let employeeCount: number | null | undefined;
  if (body.employee_count === undefined || body.employee_count === null) {
    employeeCount = body.employee_count as null | undefined;
  } else if (
    typeof body.employee_count !== "number" ||
    !Number.isFinite(body.employee_count) ||
    !Number.isInteger(body.employee_count)
  ) {
    issues.push({
      field: "employee_count",
      message: "employee_count must be an integer or null.",
    });
  } else if (body.employee_count < 0 || body.employee_count > MAX_EMPLOYEE_COUNT) {
    issues.push({
      field: "employee_count",
      message: `employee_count must be between 0 and ${MAX_EMPLOYEE_COUNT}.`,
    });
  } else {
    employeeCount = body.employee_count;
  }

  const companyScaleTier = validateOptionalStringField(
    body.company_scale_tier,
    "company_scale_tier",
    MAX_COMPANY_SCALE_TIER_LENGTH,
    issues,
  );

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const payload: SalaryPredictRequestPayload = {
    title,
    skills,
    industries,
  };
  if (location !== undefined) payload.location = location;
  if (country !== undefined) payload.country = country.toLowerCase();
  if (experienceLevel !== undefined) payload.experience_level = experienceLevel;
  if (workType !== undefined) payload.work_type = workType;
  if (remoteAllowedRaw === null || typeof remoteAllowedRaw === "boolean") {
    payload.remote_allowed = remoteAllowedRaw;
  }
  if (employeeCount !== undefined) payload.employee_count = employeeCount;
  if (body.company_scale_tier === null) {
    payload.company_scale_tier = null;
  } else if (companyScaleTier !== undefined) {
    payload.company_scale_tier = companyScaleTier;
  }

  return { ok: true, payload };
}

export async function POST(request: NextRequest) {
  const guard = runMlProxyGuards(request, "predict", ROUTE);
  if (guard.response) return guard.response;
  const context = guard.context;

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    const response = createValidationResponse([
      { field: "body", message: "Request body must be valid JSON." },
    ]);
    logMlProxyResult(context, ROUTE, "predict", 400, false, "invalid_json");
    return response;
  }

  const validation = validatePredictRequestBody(parsedBody);
  if (!validation.ok) {
    const response = createValidationResponse(validation.issues);
    logMlProxyResult(context, ROUTE, "predict", 400, false, "invalid_request");
    return response;
  }

  try {
    const res = await fetch(`${getMlServiceUrl()}/api/v1/salary/predict`, {
      method: "POST",
      headers: buildMlUpstreamHeaders(
        request,
        context.clientIp,
        "application/json",
      ),
      body: JSON.stringify(validation.payload),
      cache: "no-store",
    });

    if (!res.ok) {
      const response = await proxyUpstreamError(res);
      logMlProxyResult(
        context,
        ROUTE,
        "predict",
        response.status,
        response.status === 429,
        "upstream_error",
      );
      return response;
    }

    const data = await res.json();
    const response = NextResponse.json(data);
    logMlProxyResult(context, ROUTE, "predict", 200, false, "ok");
    return response;
  } catch (error) {
    console.error("ML salary predict proxy error:", error);
    const response = NextResponse.json(
      { error: "ml_unavailable", message: "ML service unavailable" },
      { status: 503 }
    );
    logMlProxyResult(context, ROUTE, "predict", 503, true, "exception");
    return response;
  }
}
