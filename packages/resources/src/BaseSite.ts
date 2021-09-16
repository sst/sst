import * as cloudfront from "@aws-cdk/aws-cloudfront";

export interface BaseSiteEnvironmentOutputsInfo {
  readonly path: string;
  readonly stack: string;
  readonly environmentOutputs: { [key: string]: string };
}

export interface BaseSiteReplaceProps {
  readonly files: string;
  readonly search: string;
  readonly replace: string;
}

export function buildErrorResponsesForRedirectToIndex(
  indexPage: string
): cloudfront.ErrorResponse[] {
  return [
    {
      httpStatus: 403,
      responsePagePath: `/${indexPage}`,
      responseHttpStatus: 200,
    },
    {
      httpStatus: 404,
      responsePagePath: `/${indexPage}`,
      responseHttpStatus: 200,
    },
  ];
}

export function buildErrorResponsesFor404ErrorPage(
  errorPage: string
): cloudfront.ErrorResponse[] {
  return [
    {
      httpStatus: 403,
      responsePagePath: `/${errorPage}`,
    },
    {
      httpStatus: 404,
      responsePagePath: `/${errorPage}`,
    },
  ];
}
