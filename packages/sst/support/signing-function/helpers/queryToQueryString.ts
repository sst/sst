/**
 * Converts `HttpRequest`'s query into `CloudFrontRequest`'s querystring
 */
export const queryToQueryString = (
  query: Record<string, string>
): string => {
  const keys: Array<string> = [];
  const serialized: Record<string, string> = {};
  for (const key of Object.keys(query)) {
    keys.push(key);
    const value = query[key];
    serialized[key] = `${key}=${value}`;
  }
  return keys
    .map((key) => serialized[key])
    .join("&");
};
