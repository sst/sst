import * as cdk from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as acm from "aws-cdk-lib/aws-certificatemanager";

export interface BaseSiteDomainProps {
  domainName: string;
  domainAlias?: string;
  hostedZone?: string;
  alternateNames?: string[];
  isExternalDomain?: boolean;
  cdk?: {
    hostedZone?: route53.IHostedZone;
    certificate?: acm.ICertificate;
  };
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

export interface BaseSiteCdkDistributionProps
  extends Omit<cloudfront.DistributionProps, "defaultBehavior"> {
  defaultBehavior?: cloudfront.AddBehaviorOptions;
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
    buildCmdEnvironment[key] = cdk.Token.isUnresolved(value)
      ? `{{ ${key} }}`
      : value;
  });

  return buildCmdEnvironment;
}
