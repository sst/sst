import { Construct } from 'constructs';
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

  ///////////////////
  // Parse input
  ///////////////////

  // customDomain is a string
  if (typeof customDomain === "string") {
    // validate: customDomain is a TOKEN string
    // ie. imported SSM value: ssm.StringParameter.valueForStringParameter()
    if (cdk.Token.isUnresolved(customDomain)) {
      throw new Error(
        `You also need to specify the "hostedZone" if the "domainName" is passed in as a reference.`
      );
    }

    domainName = customDomain;
    assertDomainNameIsLowerCase(domainName);
    hostedZoneDomain = customDomain.split(".").slice(1).join(".");
  }

  // customDomain.domainName not exists
  else if (!customDomain.domainName) {
    throw new Error(`Missing "domainName" in sst.Api's customDomain setting`);
  }

  // customDomain.domainName is a string
  else if (typeof customDomain.domainName === "string") {
    // parse customDomain.domainName
    if (cdk.Token.isUnresolved(customDomain.domainName)) {
      // If customDomain is a TOKEN string, "hostedZone" has to be passed in. This
      // is because "hostedZone" cannot be parsed from a TOKEN value.
      if (!customDomain.hostedZone) {
        throw new Error(
          `You also need to specify the "hostedZone" if the "domainName" is passed in as a reference.`
        );
      }
      domainName = customDomain.domainName;
    } else {
      domainName = customDomain.domainName;
      assertDomainNameIsLowerCase(domainName);
    }

    // parse customDomain.hostedZone
    if (!customDomain.hostedZone) {
      hostedZoneDomain = domainName.split(".").slice(1).join(".");
    } else if (typeof customDomain.hostedZone === "string") {
      hostedZoneDomain = customDomain.hostedZone;
    } else {
      hostedZone = customDomain.hostedZone;
    }

    certificate = customDomain.certificate;
    mappingKey = customDomain.path;
  }

  // customDomain.domainName is a construct
  else {
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

    domainName = customDomain.domainName.name;
    apigDomain = customDomain.domainName;
    mappingKey = customDomain.path;
  }

  ///////////////////
  // Create domain
  ///////////////////
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

    // Create DNS record
    const record = new route53.ARecord(scope, "AliasRecord", {
      recordName: domainName,
      zone: hostedZone as route53.IHostedZone,
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

    isApigDomainCreated = true;
  }

  return {
    apigDomain: apigDomain as apig.IDomainName,
    mappingKey,
    certificate,
    isApigDomainCreated,
    isCertificatedCreated,
    // Note: If mapping key is set, the URL needs a trailing slash. Without the
    //       trailing slash, the API fails with the error
    //       {"message":"Not Found"}
    url: mappingKey ? `${domainName}/${mappingKey}/` : domainName,
  };
}

function assertDomainNameIsLowerCase(domainName: string): void {
  if (domainName !== domainName.toLowerCase()) {
    throw new Error(`The domain name needs to be in lowercase`);
  }
}
