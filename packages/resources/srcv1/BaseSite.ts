import * as cdk from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as acm from "aws-cdk-lib/aws-certificatemanager";

export interface BaseSiteDomainProps {
  domainName: string;
  domainAlias?: string;
  hostedZone?: string | route53.IHostedZone;
  certificate?: acm.ICertificate;
  alternateNames?: string[];
  isExternalDomain?: boolean;
}

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

export interface BaseSiteCdkDistributionProps
  extends Omit<cloudfront.DistributionProps, "defaultBehavior"> {
  readonly defaultBehavior?: cloudfront.AddBehaviorOptions;
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
