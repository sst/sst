import type { CloudFrontRequest } from "aws-lambda";

export const isLambdaUrlRequest = (domainName: string) => {
  return /[a-z0-9]+\.lambda-url\.[a-z0-9-]+\.on\.aws/.test(domainName);
};
