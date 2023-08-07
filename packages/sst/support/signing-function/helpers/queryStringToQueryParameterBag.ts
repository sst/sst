import { QueryParameterBag } from "@aws-sdk/types";

export const queryStringToQueryParameterBag = (
  queryString: string
): QueryParameterBag => {
  const query: QueryParameterBag = {};

  const kvPairs = queryString.split("&").filter((v) => v);

  for (const kvPair of kvPairs) {
    const split = kvPair.split("=") as [string, string?];

    const key = split[0];
    const value = split[1];

    if (query[key] === undefined || query[key] === null) {
      query[key] = value ? decodeURIComponent(value) : null;
      continue;
    }

    if (value === undefined || value === "") {
      continue;
    }

    if (Array.isArray(query[key])) {
      (query[key] as string[]).push(decodeURIComponent(value));
      continue;
    }

    query[key] = [query[key] as string, decodeURIComponent(value)];
  }

  return query;
};
