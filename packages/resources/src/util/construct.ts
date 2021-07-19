/* eslint-disable @typescript-eslint/ban-ts-comment*/

import * as cdk from "@aws-cdk/core";

const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");

export function isConstructOf(
  construct: cdk.Construct,
  moduleName: string
): boolean {
  // We need to check if construct is an CDK construct. To do that:
  // - we cannot use the `construct instanceof` check because ie. the PolicyStatement
  //   instance in the user's app might come from a different npm package version
  // - we cannot use the `construct.constructor.name` check because the constructor
  //   name can be prefixed with a number ie. PolicyStatement2
  //
  // Therefore we are going to get the constructor's fqn. The constructor for a CDK
  // construct looks like:
  //    [class Bucket2 extends BucketBase] {
  //      [Symbol(jsii.rtti)]: { fqn: '@aws-cdk/aws-s3.Bucket', version: '1.91.0' }
  //    }
  // We will check against `fqn`.
  let cdkModule;
  // @ts-expect-error TS7053: Element implicitly has an 'any' type because expression of type 'unique symbol' can't be used to index type 'Function'.
  const fqn = construct?.constructor?.[JSII_RTTI_SYMBOL_1]?.fqn;
  if (typeof fqn === "string" && fqn.startsWith("@aws-cdk/")) {
    cdkModule = fqn.substring(9);
  }

  return cdkModule === moduleName;
}

export function isConstruct(
  construct: cdk.Construct,
): boolean {
  const fqn = construct?.constructor?.[JSII_RTTI_SYMBOL_1]?.fqn;
  return typeof fqn === "string" && fqn.startsWith("@aws-cdk/");
}
