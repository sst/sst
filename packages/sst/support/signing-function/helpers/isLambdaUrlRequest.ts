import type { CloudFrontRequest } from "aws-lambda";

export const isLambdaUrlRequest = (request: CloudFrontRequest) => {
  return /[a-z0-9]+\.lambda-url\.[a-z0-9-]+\.on\.aws/.test(
    request.origin?.custom?.domainName || ""
  );
};
