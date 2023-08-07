import { CloudFrontHeaders } from "aws-lambda";
import { HeaderBag } from "@aws-sdk/types";

export const cloudFrontHeadersToHeaderBag = (
  cloudFrontHeaders: CloudFrontHeaders
): HeaderBag => {
  const headerBag: HeaderBag = {};

  for (const [lowerCaseHeader, values] of Object.entries(cloudFrontHeaders)) {
    /**
     * According to the RFC2616, section 4.2,
     * https://datatracker.ietf.org/doc/html/rfc2616#section-4.2
     *
     *   It MUST be possible to combine the multiple header fields into one
     *   "field-name: field-value" pair, without changing the semantics of the
     *   message, by appending each subsequent field-value to the first, each
     *   separated by a comma.
     */
    headerBag[lowerCaseHeader] = values.map(({ value }) => value).join(",");
  }

  return headerBag;
};
