import { CloudFrontRequestHandler } from "aws-lambda";
import {
  cloudFrontHeadersToHeaderBag,
  getRegionFromCustomDomainName,
  getSigV4,
  headerBagToCfHeaders,
  queryStringToQueryParameterBag,
} from "./helpers";

export const handler: CloudFrontRequestHandler = async (event) => {
  const request = event.Records[0].cf.request;

  // The signing function must be triggered by the eventType: 'origin-request'.
  if (request.origin === undefined) {
    throw new Error("origin must be defined");
  }

  // Do not process requests to S3.
  // This should not happen because the signing function is
  // associated to behaviors targeting function URLs.
  if ('s3' in request.origin) {
    return request;
  }

  const domainName = request.origin.custom.domainName;

  const region = getRegionFromCustomDomainName(domainName);

  // Do not process requests to non-Lambda URLs.
  if (region === undefined) {
    return request;
  }

  const query = queryStringToQueryParameterBag(request.querystring);
  const sigv4 = getSigV4(region);

  const signed = await sigv4.sign({
    method: request.method,
    hostname: domainName,
    headers: cloudFrontHeadersToHeaderBag(request.headers),
    path: request.uri,
    query,
    protocol: "https",
    body: request.body?.data ? Buffer.from(request.body.data, "base64") : undefined,
  });
  request.headers = headerBagToCfHeaders(signed.headers);

  return request;
};
