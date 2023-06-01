import { Token } from "aws-cdk-lib/core";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { AppSyncApi } from "../AppSyncApi.js";
import {
  CfnDomainName,
  CfnDomainNameApiAssociation,
} from "aws-cdk-lib/aws-appsync";

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
   * DNS record type for the Route 53 record associated with the custom domain. Default is CNAME.
   * @default CNAME
   */
  recordType?: "CNAME" | "A_AAAA";
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

interface CustomDomainData {
  certificate: acm.ICertificate;
  domainName: string;
  hostedZone?: route53.IHostedZone;
  recordType?: CustomDomainProps["recordType"];
}

export function buildCustomDomainData(
  scope: AppSyncApi,
  customDomain: string | CustomDomainProps | undefined
): CustomDomainData | undefined {
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

export function cleanup(scope: AppSyncApi, domainData: CustomDomainData) {
  const cfnDomainName = getCfnDomainName(scope);
  const cfnDomainNameApiAssociation = getCfnDomainNameApiAssociation(scope);
  if (domainData.hostedZone) {
    createRecords(
      scope,
      domainData.domainName,
      domainData.hostedZone,
      domainData.recordType,
      cfnDomainName
    );
  }
  fixDomainResourceDependencies(cfnDomainName, cfnDomainNameApiAssociation);
}

function buildDataForStringInput(scope: AppSyncApi, customDomain: string) {
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

  return {
    certificate,
    domainName,
    hostedZone,
  };
}

function buildDataForInternalDomainInput(
  scope: AppSyncApi,
  customDomain: CustomDomainProps
) {
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

  return {
    certificate,
    domainName,
    hostedZone,
    recordType: customDomain.recordType,
  };
}

function buildDataForExternalDomainInput(
  _scope: AppSyncApi,
  customDomain: CustomDomainProps
) {
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

function createRecords(
  scope: AppSyncApi,
  domainName: string,
  hostedZone: route53.IHostedZone,
  recordType: CustomDomainProps["recordType"],
  cfnDomainName: CfnDomainName
) {
  // create DNS record
  const aRecordProps = {
    recordName: domainName,
    zone: hostedZone,
    target: route53.RecordTarget.fromAlias({
      bind() {
        return {
          hostedZoneId: route53Targets.CloudFrontTarget.CLOUDFRONT_ZONE_ID,
          dnsName: cfnDomainName.attrAppSyncDomainName,
        };
      },
    }),
  };
  const records =
    (recordType || "CNAME") === "CNAME"
      ? [
          new route53.CnameRecord(scope, "CnameRecord", {
            recordName: domainName,
            zone: hostedZone,
            domainName: cfnDomainName.attrAppSyncDomainName,
          }),
        ]
      : [
          new route53.ARecord(scope, "AliasRecord", aRecordProps),
          new route53.AaaaRecord(scope, "AliasRecordAAAA", aRecordProps),
        ];
  // note: If domainName is a TOKEN string ie. ${TOKEN..}, the route53.ARecord
  //       construct will append ".${hostedZoneName}" to the end of the domain.
  //       This is because the construct tries to check if the record name
  //       ends with the domain name. If not, it will append the domain name.
  //       So, we need remove this behavior.
  if (Token.isUnresolved(domainName)) {
    records.forEach((record) => {
      const cfnRecord = record.node.defaultChild as route53.CfnRecordSet;
      cfnRecord.name = domainName;
    });
  }
}

function getCfnDomainName(scope: AppSyncApi) {
  return scope.cdk.graphqlApi.node.children.find(
    (child) =>
      (child as CfnDomainName).cfnResourceType === "AWS::AppSync::DomainName"
  ) as CfnDomainName;
}

function getCfnDomainNameApiAssociation(scope: AppSyncApi) {
  return scope.cdk.graphqlApi.node.children.find(
    (child) =>
      (child as CfnDomainNameApiAssociation).cfnResourceType ===
      "AWS::AppSync::DomainNameApiAssociation"
  ) as CfnDomainNameApiAssociation;
}

function fixDomainResourceDependencies(
  cfnDomainName: CfnDomainName,
  cfnDomainNameApiAssociation: CfnDomainNameApiAssociation
) {
  // note: As of CDK 2.20.0, the "AWS::AppSync::DomainNameApiAssociation" resource
  //       is not dependent on the "AWS::AppSync::DomainName" resource. This leads
  //       CloudFormation deploy error if DomainNameApiAssociation is created before
  //       DomainName is created.
  //       https://github.com/aws/aws-cdk/issues/18395#issuecomment-1099455502
  //       To workaround this issue, we need to add a dependency manually.
  if (cfnDomainName && cfnDomainNameApiAssociation) {
    cfnDomainNameApiAssociation.node.addDependency(cfnDomainName);
  }
}

function assertDomainNameIsLowerCase(domainName: string): void {
  if (domainName !== domainName.toLowerCase()) {
    throw new Error(`The domain name needs to be in lowercase`);
  }
}
