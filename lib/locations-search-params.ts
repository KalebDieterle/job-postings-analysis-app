import {
  createSearchParamsCache,
  parseAsString,
  parseAsInteger,
} from "nuqs/server";

export const locationsSearchParamsSchema = {
  q: parseAsString.withDefault(""),
  state: parseAsString.withDefault(""),
  country: parseAsString.withDefault(""),
  minSalary: parseAsInteger.withDefault(0),
  minJobs: parseAsInteger.withDefault(0),
  sort: parseAsString.withDefault("jobs"), // 'jobs' | 'salary' | 'name'
  page: parseAsInteger.withDefault(1),
};

export const locationsSearchParamsCache = createSearchParamsCache(
  locationsSearchParamsSchema
);
