import {
  CloudFrontRequestHandler,
} from "aws-lambda";
import {
  cfHeadersToHeaderBag,
  getRegionFromLambdaUrl,
  getSigV4,
  headerBagToCfHeaders,
  isLambdaUrlRequest,
  queryStringToQuery,
} from "./helpers";

export const handler: CloudFrontRequestHandler = async (event) => {
  const request = event.Records[0].cf.request;
  const domainName = request.origin?.custom?.domainName;

  if (!domainName || !isLambdaUrlRequest(domainName)) return request;

  const region = getRegionFromLambdaUrl(domainName);
  const sigv4 = getSigV4(region);

  const headerBag = cfHeadersToHeaderBag(request.headers);

  const requestToSign = {
    method: request.method,
    headers: headerBag,
    hostname: headerBag.host,
    path: request.uri,
    query: queryStringToQuery(request.querystring),
    protocol: "https",
  };

  if (!request.body?.data) {
    const signed = await sigv4.sign({
      ...requestToSign,
      body: undefined,
    });
    request.headers = headerBagToCfHeaders(signed.headers);

    return request;
  }

  const signed = await sigv4.sign({
    ...requestToSign,
    body: Buffer.from(request.body.data, "base64").toString(),
  });
  request.headers = headerBagToCfHeaders(signed.headers);

  return request;
};
