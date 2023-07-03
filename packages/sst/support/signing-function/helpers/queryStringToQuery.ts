/**
 * Converts `CloudFrontRequest`'s querystring into `HttpRequest`'s query
 */
export const queryStringToQuery = (
  querystring: string
): Record<string, string> => {
  const query: Record<string, string> = {};
  const kvPairs = querystring.split("&").filter(Boolean);
  for (const kvPair of kvPairs) {
    const [key, value] = kvPair.split("=");
    if (key && value) query[key] = value;
  }
  return query;
};
