import {
    createSearchParamsCache,
    parseAsString,
    parseAsInteger,
    parseAsArrayOf
} from 'nuqs/server';
// Note: We use /server for the cache, but the parsers are standard.

export const searchParamsSchema = {
  q: parseAsString.withDefault(''),
  location: parseAsString.withDefault(''),
  experience: parseAsArrayOf(parseAsString).withDefault([]),
  minSalary: parseAsInteger.withDefault(0),
};

export const searchParamsCache = createSearchParamsCache(searchParamsSchema);

export const coordinatesSchema = {
    location: parseAsString.withDefault('').withOptions({shallow: false}),
};

export const experienceSchema = {
    experience: parseAsArrayOf(parseAsString).withDefault([])
};

export const salarySchema = {
    minSalary: parseAsInteger.withDefault(0),
};

export type SearchParams = typeof searchParamsCache;