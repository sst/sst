import { Token, Lazy } from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { AppSyncApi } from "../AppSyncApi";

export interface CustomDomainProps {
  /**
   * The domain to be assigned to the API endpoint (ie. api.domain.com)
   */
  domainName?: string;
  /**
   * The hosted zone in Route 53 that contains the domain. By default, SST will look for a hosted zone by stripping out the first part of the domainName that's passed in. So, if your domainName is api.domain.com. SST will default the hostedZone to domain.com.
   */
  hostedZone?: string;
  /**
   * Set this option if the domain is not hosted on Amazon Route 53.
   */
  isExternalDomain?: boolean;
  cdk?: {
    /**
     * Override the internally created hosted zone
     */
    hostedZone?: route53.IHostedZone;
    /**
     * Override the internally created certificate
     */
    certificate?: acm.ICertificate;
  };
}

export function buildCustomDomainData(
  scope: AppSyncApi,
  customDomain: string | CustomDomainProps | undefined
): appsync.DomainOptions | undefined {
  if (customDomain === undefined) {
    return;
  }
  // customDomain is a string
  else if (typeof customDomain === "string") {
    return buildDataForStringInput(scope, customDomain);
  }
  // customDomain.domainName is a string
  else if (customDomain.domainName) {
    return customDomain.isExternalDomain
      ? buildDataForExternalDomainInput(scope, customDomain)
      : buildDataForInternalDomainInput(scope, customDomain);
  }
  // customDomain.domainName not exists
  throw new Error(
    `Missing "domainName" in sst.AppSyncApi's customDomain setting`
  );
}

function buildDataForStringInput(
  scope: AppSyncApi,
  customDomain: string
): appsync.DomainOptions {
  // validate: customDomain is a TOKEN string
  // ie. imported SSM value: ssm.StringParameter.valueForStringParameter()
  if (Token.isUnresolved(customDomain)) {
    throw new Error(
      `You also need to specify the "hostedZone" if the "domainName" is passed in as a reference.`
    );
  }

  assertDomainNameIsLowerCase(customDomain);

  const domainName = customDomain;
  const hostedZoneDomain = domainName.split(".").slice(1).join(".");
  const hostedZone = lookupHostedZone(scope, hostedZoneDomain);
  const certificate = createCertificate(scope, domainName, hostedZone);
  createRecord(scope, hostedZone, domainName);

  return {
    certificate,
    domainName,
  };
}

function buildDataForInternalDomainInput(
  scope: AppSyncApi,
  customDomain: CustomDomainProps
): appsync.DomainOptions {
  // If customDomain is a TOKEN string, "hostedZone" has to be passed in. This
  // is because "hostedZone" cannot be parsed from a TOKEN value.
  if (Token.isUnresolved(customDomain.domainName)) {
    if (!customDomain.hostedZone) {
      throw new Error(
        `You also need to specify the "hostedZone" if the "domainName" is passed in as a reference.`
      );
    }
  } else {
    assertDomainNameIsLowerCase(customDomain.domainName as string);
  }

  const domainName = customDomain.domainName as string;

  // Lookup hosted zone
  // Note: Allow user passing in `hostedZone` object. The use case is when
  //       there are multiple HostedZones with the same domain, but one is
  //       public, and one is private.
  let hostedZone: route53.IHostedZone;
  if (customDomain.hostedZone) {
    const hostedZoneDomain = customDomain.hostedZone;
    hostedZone = lookupHostedZone(scope, hostedZoneDomain);
  } else if (customDomain.cdk?.hostedZone) {
    hostedZone = customDomain.cdk.hostedZone;
  } else {
    const hostedZoneDomain = domainName.split(".").slice(1).join(".");
    hostedZone = lookupHostedZone(scope, hostedZoneDomain);
  }

  // Create certificate
  // Note: Allow user passing in `certificate` object. The use case is for
  //       user to create wildcard certificate or using an imported certificate.
  const certificate = customDomain.cdk?.certificate
    ? customDomain.cdk.certificate
    : createCertificate(scope, domainName, hostedZone);

  createRecord(scope, hostedZone, domainName);

  return {
    certificate,
    domainName,
  };
}

function buildDataForExternalDomainInput(
  scope: AppSyncApi,
  customDomain: CustomDomainProps
): appsync.DomainOptions {
  // if it is external, then a certificate is required
  if (!customDomain.cdk?.certificate) {
    throw new Error(
      `A valid certificate is required when "isExternalDomain" is set to "true".`
    );
  }
  // if it is external, then the hostedZone is not required
  if (customDomain.hostedZone || customDomain.cdk?.hostedZone) {
    throw new Error(
      `Hosted zones can only be configured for domains hosted on Amazon Route 53. Do not set the "hostedZone" when "isExternalDomain" is enabled.`
    );
  }

  const domainName = customDomain.domainName as string;
  assertDomainNameIsLowerCase(domainName);
  const certificate = customDomain.cdk.certificate;

  return {
    certificate,
    domainName,
  };
}

function lookupHostedZone(scope: AppSyncApi, hostedZoneDomain: string) {
  return route53.HostedZone.fromLookup(scope, "HostedZone", {
    domainName: hostedZoneDomain,
  });
}

function createCertificate(
  scope: AppSyncApi,
  domainName: string,
  hostedZone: route53.IHostedZone
) {
  return new acm.Certificate(scope, "Certificate", {
    domainName,
    validation: acm.CertificateValidation.fromDns(hostedZone),
  });
}

function createRecord(
  scope: AppSyncApi,
  hostedZone: route53.IHostedZone,
  domainName: string
) {
  // create DNS record
  const record = new route53.CnameRecord(scope, "CnameRecord", {
    recordName: domainName,
    zone: hostedZone,
    domainName: Lazy.string({
      produce() {
        return scope._cfnDomainName!.attrAppSyncDomainName;
      },
    }),
  });

  // note: If domainName is a TOKEN string ie. ${TOKEN..}, the route53.ARecord
  //       construct will append ".${hostedZoneName}" to the end of the domain.
  //       This is because the construct tries to check if the record name
  //       ends with the domain name. If not, it will append the domain name.
  //       So, we need remove this behavior.
  if (Token.isUnresolved(domainName)) {
    const cfnRecord = record.node.defaultChild as route53.CfnRecordSet;
    cfnRecord.name = domainName;
  }
}

function assertDomainNameIsLowerCase(domainName: string): void {
  if (domainName !== domainName.toLowerCase()) {
    throw new Error(`The domain name needs to be in lowercase`);
  }
}
