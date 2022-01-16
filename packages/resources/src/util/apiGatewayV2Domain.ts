import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as apig from "@aws-cdk/aws-apigatewayv2-alpha";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";

export interface CustomDomainProps {
  readonly domainName: string | apig.IDomainName;
  readonly hostedZone?: string | route53.IHostedZone;
  readonly certificate?: acm.ICertificate;
  readonly path?: string;
  readonly isExternalDomain?: boolean;
}

export interface CustomDomainData {
  readonly apigDomain: apig.IDomainName;
  readonly mappingKey?: string;
  readonly certificate?: acm.ICertificate;
  readonly isApigDomainCreated: boolean;
  readonly isCertificatedCreated: boolean;
  readonly url: string;
}

export function buildCustomDomainData(
  scope: Construct,
  customDomain: string | CustomDomainProps | undefined
): CustomDomainData | undefined {
  if (customDomain === undefined) {
    return;
  }
  // customDomain is a string
  else if (typeof customDomain === "string") {
    return buildDataForStringInput(scope, customDomain);
  }
  // customDomain.domainName not exists
  else if (!customDomain.domainName) {
    throw new Error(`Missing "domainName" in sst.Api's customDomain setting`);
  }
  // customDomain.domainName is a string
  else if (typeof customDomain.domainName === "string") {
    return customDomain.isExternalDomain
      ? buildDataForExternalDomainInput(scope, customDomain)
      : buildDataForInternalDomainInput(scope, customDomain);
  }
  // customDomain.domainName is a construct
  return buildDataForConstructInput(scope, customDomain);
}

function buildDataForStringInput(
  scope: Construct,
  customDomain: string
): CustomDomainData {
  // validate: customDomain is a TOKEN string
  // ie. imported SSM value: ssm.StringParameter.valueForStringParameter()
  if (cdk.Token.isUnresolved(customDomain)) {
    throw new Error(
      `You also need to specify the "hostedZone" if the "domainName" is passed in as a reference.`
    );
  }

  assertDomainNameIsLowerCase(customDomain);

  const domainName = customDomain;
  const hostedZoneDomain = domainName.split(".").slice(1).join(".");
  const hostedZone = lookupHostedZone(scope, hostedZoneDomain);
  const certificate = createCertificate(scope, domainName, hostedZone);
  const apigDomain = createApigDomain(scope, domainName, certificate);
  const record = createARecord(scope, hostedZone, domainName, apigDomain);

  return {
    apigDomain,
    certificate,
    isApigDomainCreated: true,
    isCertificatedCreated: true,
    url: buildDomainUrl(domainName),
  };
}

function buildDataForInternalDomainInput(
  scope: Construct,
  customDomain: CustomDomainProps
): CustomDomainData {
  // If customDomain is a TOKEN string, "hostedZone" has to be passed in. This
  // is because "hostedZone" cannot be parsed from a TOKEN value.
  if (cdk.Token.isUnresolved(customDomain.domainName)) {
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

  let hostedZone;
  if (!customDomain.hostedZone) {
    const hostedZoneDomain = domainName.split(".").slice(1).join(".");
    hostedZone = lookupHostedZone(scope, hostedZoneDomain);
  } else if (typeof customDomain.hostedZone === "string") {
    const hostedZoneDomain = customDomain.hostedZone;
    hostedZone = lookupHostedZone(scope, hostedZoneDomain);
  } else {
    hostedZone = customDomain.hostedZone;
  }

  // Create certificate
  // Note: Allow user passing in `certificate` object. The use case is for
  //       user to create wildcard certificate or using an imported certificate.
  let certificate, isCertificatedCreated;
  if (customDomain.certificate) {
    certificate = customDomain.certificate;
    isCertificatedCreated = false;
  } else {
    certificate = createCertificate(scope, domainName, hostedZone);
    isCertificatedCreated = true;
  }

  const apigDomain = createApigDomain(scope, domainName, certificate);
  const mappingKey = customDomain.path;
  const record = createARecord(scope, hostedZone, domainName, apigDomain);

  return {
    apigDomain,
    mappingKey,
    certificate,
    isApigDomainCreated: true,
    isCertificatedCreated,
    url: buildDomainUrl(domainName, mappingKey),
  };
}

function buildDataForExternalDomainInput(
  scope: Construct,
  customDomain: CustomDomainProps
): CustomDomainData {
  // if it is external, then a certificate is required
  if (!customDomain.certificate) {
    throw new Error(
      `A valid certificate is required when "isExternalDomain" is set to "true".`
    );
  }
  // if it is external, then the hostedZone is not required
  if (customDomain.hostedZone) {
    throw new Error(
      `Hosted zones can only be configured for domains hosted on Amazon Route 53. Do not set the "customDomain.hostedZone" when "isExternalDomain" is enabled.`
    );
  }

  const domainName = customDomain.domainName as string;
  assertDomainNameIsLowerCase(domainName);
  const certificate = customDomain.certificate;
  const apigDomain = createApigDomain(scope, domainName, certificate);
  const mappingKey = customDomain.path;

  return {
    apigDomain,
    mappingKey,
    certificate,
    isApigDomainCreated: true,
    isCertificatedCreated: false,
    url: buildDomainUrl(domainName, mappingKey),
  };
}

function buildDataForConstructInput(
  scope: Construct,
  customDomain: CustomDomainProps
): CustomDomainData {
  //  Allow user passing in `apigDomain` object. The use case is a user creates
  //  multiple API endpoints, and is mapping them under the same custom domain.
  //  `sst.Api` needs to expose the `apigDomain` construct created in the first
  //  Api, and lets user pass it in when creating the second Api.

  if (customDomain.hostedZone) {
    throw new Error(
      `Cannot configure the "hostedZone" when the "domainName" is a construct`
    );
  }
  if (customDomain.certificate) {
    throw new Error(
      `Cannot configure the "certificate" when the "domainName" is a construct`
    );
  }

  const apigDomain = customDomain.domainName as apig.IDomainName;
  const domainName = apigDomain.name;
  const mappingKey = customDomain.path;

  return {
    apigDomain,
    mappingKey,
    certificate: undefined,
    isApigDomainCreated: false,
    isCertificatedCreated: false,
    url: buildDomainUrl(domainName, mappingKey),
  };
}

function lookupHostedZone(scope: Construct, hostedZoneDomain: string) {
  return route53.HostedZone.fromLookup(scope, "HostedZone", {
    domainName: hostedZoneDomain,
  });
}

function createCertificate(
  scope: Construct,
  domainName: string,
  hostedZone: route53.IHostedZone
) {
  return new acm.Certificate(scope, "Certificate", {
    domainName,
    validation: acm.CertificateValidation.fromDns(hostedZone),
  });
}

function createApigDomain(
  scope: Construct,
  domainName: string,
  certificate: acm.ICertificate
) {
  return new apig.DomainName(scope, "DomainName", {
    domainName,
    certificate,
  });
}

function createARecord(
  scope: Construct,
  hostedZone: route53.IHostedZone,
  domainName: string,
  apigDomain: apig.IDomainName
) {
  // create DNS record
  const record = new route53.ARecord(scope, "AliasRecord", {
    recordName: domainName,
    zone: hostedZone,
    target: route53.RecordTarget.fromAlias(
      new route53Targets.ApiGatewayv2DomainProperties(
        apigDomain.regionalDomainName,
        apigDomain.regionalHostedZoneId
      )
    ),
  });
  // note: If domainName is a TOKEN string ie. ${TOKEN..}, the route53.ARecord
  //       construct will append ".${hostedZoneName}" to the end of the domain.
  //       This is because the construct tries to check if the record name
  //       ends with the domain name. If not, it will append the domain name.
  //       So, we need remove this behavior.
  if (cdk.Token.isUnresolved(domainName)) {
    const cfnRecord = record.node.defaultChild as route53.CfnRecordSet;
    cfnRecord.name = domainName;
  }
}

function buildDomainUrl(domainName: string, mappingKey?: string) {
  // Note: If mapping key is set, the URL needs a trailing slash. Without the
  //       trailing slash, the API fails with the error
  //       {"message":"Not Found"}
  return mappingKey ? `${domainName}/${mappingKey}/` : domainName;
}

function assertDomainNameIsLowerCase(domainName: string): void {
  if (domainName !== domainName.toLowerCase()) {
    throw new Error(`The domain name needs to be in lowercase`);
  }
}
