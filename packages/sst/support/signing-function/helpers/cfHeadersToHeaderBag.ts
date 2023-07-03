import { CloudFrontHeaders } from "aws-lambda";
import { HeaderBag } from "./types";

/**
 * Converts CloudFront headers (can have array of header values) to simple
 * header bag (object) required by `sigv4.sign`
 */
export const cfHeadersToHeaderBag = (
  cfHeaders: CloudFrontHeaders
): HeaderBag => {
  let headerBag: HeaderBag = {};
  for (const [header, values] of Object.entries(cfHeaders)) {
    headerBag[header] = values[0].value;
  }
  return headerBag;
};
