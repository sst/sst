import { Token } from "aws-cdk-lib/core";
import {
  ErrorResponse,
  DistributionProps,
  BehaviorOptions,
  IOrigin,
} from "aws-cdk-lib/aws-cloudfront";

export interface BaseSiteFileOptions {
  files: string | string[];
  ignore?: string | string[];
  cacheControl?: string;
  contentType?: string;
  contentEncoding?: string;
}

export interface BaseSiteEnvironmentOutputsInfo {
  path: string;
  stack: string;
  environmentOutputs: { [key: string]: string };
}

export interface BaseSiteReplaceProps {
  files: string;
  search: string;
  replace: string;
}

export function buildErrorResponsesForRedirectToIndex(
  indexPage: string
): ErrorResponse[] {
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
): ErrorResponse[] {
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

export interface BaseSiteCdkDistributionProps
  extends Omit<DistributionProps, "defaultBehavior"> {
  defaultBehavior?: Omit<BehaviorOptions, "origin"> & {
    origin?: IOrigin;
  };
}

/////////////////////
// Helper Functions
/////////////////////

export function getBuildCmdEnvironment(siteEnvironment?: {
  [key: string]: string;
}): Record<string, string> {
  // Generate environment placeholders to be replaced
  // ie. environment => { API_URL: api.url }
  //     environment => API_URL="{{ API_URL }}"
  //
  const buildCmdEnvironment: Record<string, string> = {};
  Object.entries(siteEnvironment || {}).forEach(([key, value]) => {
    buildCmdEnvironment[key] = Token.isUnresolved(value)
      ? `{{ ${key} }}`
      : value;
  });

  return buildCmdEnvironment;
}
