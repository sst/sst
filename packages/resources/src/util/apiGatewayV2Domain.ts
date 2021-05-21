import * as cdk from "@aws-cdk/core";
import * as apig from "@aws-cdk/aws-apigatewayv2";
import * as route53 from "@aws-cdk/aws-route53";
import * as route53Targets from "@aws-cdk/aws-route53-targets";
import * as acm from "@aws-cdk/aws-certificatemanager";

export interface CustomDomainProps {
  readonly domainName: string | apig.IDomainName;
  readonly hostedZone?: string | route53.IHostedZone;
  readonly certificate?: acm.ICertificate;
  readonly path?: string;
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
  scope: cdk.Construct,
  customDomain: string | CustomDomainProps | undefined
): CustomDomainData | undefined {
  if (customDomain === undefined) {
    return;
  }

  // To be implemented: to allow more flexible use cases, SST should support 3 more use cases:
  //  1. Allow user passing in `hostedZone` object. The use case is when there are multiple
  //     HostedZones with the same domain, but one is public, and one is private.
  //  2. Allow user passing in `certificate` object. The use case is for user to create wildcard
  //     certificate or using an imported certificate.
  //  3. Allow user passing in `apigDomain` object. The use case is a user creates multiple API
  //     endpoints, and is mapping them under the same custom domain. `sst.Api` needs to expose the
  //     `apigDomain` construct created in the first Api, and lets user pass it in when creating
  //     the second Api.

  let domainName,
    hostedZone,
    hostedZoneDomain,
    certificate,
    apigDomain,
    mappingKey;
  let isApigDomainCreated = false;
  let isCertificatedCreated = false;

  // customDomain passed in as a string
  if (typeof customDomain === "string") {
    domainName = customDomain;
    assertDomainNameIsLowerCase(domainName);
    hostedZoneDomain = customDomain.split(".").slice(1).join(".");
  }
  // customDomain passed in as an object
  else {
    if (!customDomain.domainName) {
      throw new Error(`Missing "domainName" in sst.Api's customDomain setting`);
    }

    // parse customDomain.domainName
    if (typeof customDomain.domainName === "string") {
      domainName = customDomain.domainName;
      assertDomainNameIsLowerCase(domainName);
    } else {
      apigDomain = customDomain.domainName;

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
    }

    // parse customDomain.hostedZone
    if (!apigDomain) {
      if (!customDomain.hostedZone) {
        hostedZoneDomain = (domainName as string).split(".").slice(1).join(".");
      } else if (typeof customDomain.hostedZone === "string") {
        hostedZoneDomain = customDomain.hostedZone;
      } else {
        hostedZone = customDomain.hostedZone;
      }
    }

    certificate = customDomain.certificate;
    mappingKey = customDomain.path;
  }

  if (!apigDomain && domainName) {
    // Look up hosted zone
    if (!hostedZone && hostedZoneDomain) {
      hostedZone = route53.HostedZone.fromLookup(scope, "HostedZone", {
        domainName: hostedZoneDomain,
      });
    }

    // Create certificate
    if (!certificate) {
      certificate = new acm.Certificate(scope, "Certificate", {
        domainName,
        validation: acm.CertificateValidation.fromDns(hostedZone),
      });
      isCertificatedCreated = true;
    }

    // Create custom domain in API Gateway
    apigDomain = new apig.DomainName(scope, "DomainName", {
      domainName,
      certificate,
    });
    (isApigDomainCreated = true),
      // Create DNS record
      new route53.ARecord(scope, "AliasRecord", {
        recordName: domainName,
        zone: hostedZone as route53.IHostedZone,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.ApiGatewayv2DomainProperties(apigDomain.name, (hostedZone as route53.IHostedZone).hostedZoneId)
        ),
      });
  }

  return {
    apigDomain: apigDomain as apig.IDomainName,
    mappingKey,
    certificate,
    isApigDomainCreated,
    isCertificatedCreated,
    url: mappingKey
      ? `${(apigDomain as apig.IDomainName).name}/${mappingKey}`
      : (apigDomain as apig.IDomainName).name,
  };
}

function assertDomainNameIsLowerCase(domainName: string): void {
  if (domainName !== domainName.toLowerCase()) {
    throw new Error(`The domain name needs to be in lowercase`);
  }
}
