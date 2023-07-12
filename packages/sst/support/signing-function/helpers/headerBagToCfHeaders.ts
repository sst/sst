import { CloudFrontHeaders } from "aws-lambda";
import { HeaderBag } from "@aws-sdk/types";

/**
 * Converts simple header bag (object) to CloudFront headers
 */
export const headerBagToCfHeaders = (
  headerBag: HeaderBag
): CloudFrontHeaders => {
  const cfHeaders: CloudFrontHeaders = {};
  for (const [header, value] of Object.entries(headerBag)) {
    cfHeaders[header] = [{ key: header, value }];
  }
  return cfHeaders;
};
