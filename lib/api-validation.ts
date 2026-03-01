type IntParamOptions = {
  defaultValue: number;
  min: number;
  max: number;
};

export function parseBoundedIntParam(
  params: URLSearchParams,
  key: string,
  options: IntParamOptions,
): { value: number } | { error: string } {
  const raw = params.get(key);
  if (raw === null || raw === "") {
    return { value: options.defaultValue };
  }

  if (!/^\d+$/.test(raw)) {
    return { error: `"${key}" must be an integer` };
  }

  const parsed = Number.parseInt(raw, 10);
  if (parsed < options.min || parsed > options.max) {
    return {
      error: `"${key}" must be between ${options.min} and ${options.max}`,
    };
  }

  return { value: parsed };
}

export function parseEnumParam<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
  defaultValue: T,
): { value: T } | { error: string } {
  const raw = params.get(key);
  if (raw === null || raw === "") {
    return { value: defaultValue };
  }

  if (!allowed.includes(raw as T)) {
    return { error: `"${key}" must be one of: ${allowed.join(", ")}` };
  }

  return { value: raw as T };
}

export function parseStringParam(
  params: URLSearchParams,
  key: string,
  maxLength: number,
): { value: string } | { error: string } {
  const value = (params.get(key) ?? "").trim();
  if (value.length > maxLength) {
    return { error: `"${key}" must be ${maxLength} characters or fewer` };
  }
  return { value };
}
