import {
  createSearchParamsCache,
  parseAsString,
  parseAsInteger,
  parseAsArrayOf,
} from "nuqs/server";

export const companiesSearchParamsSchema = {
  q: parseAsString.withDefault(""),
  location: parseAsString.withDefault(""),
  companySize: parseAsArrayOf(parseAsString).withDefault([]),
  minSalary: parseAsInteger.withDefault(0),
  minPostings: parseAsInteger.withDefault(0),
  sort: parseAsString.withDefault("postings"), // 'postings' | 'salary' | 'name' | 'size'
  page: parseAsInteger.withDefault(1),
};

export const companiesSearchParamsCache = createSearchParamsCache(
  companiesSearchParamsSchema
);
