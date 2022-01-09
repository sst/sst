import { Construct } from 'constructs';
import { Function as Fn } from "aws-cdk-lib/aws-lambda";
import { Stack } from "./Stack";

const JSII_RTTI_SYMBOL_1 = Symbol.for("jsii.rtti");

export interface SSTConstructMetadata<
  T extends string = string,
  D extends Record<string, any> = Record<string, any>
> {
  type: T;
  data: D;
}

export interface SSTConstruct {
  getConstructMetadata(): SSTConstructMetadata;
}

export function isSSTConstruct(input: any): input is SSTConstruct {
  return "getConstructMetadata" in input;
}

export function getFunctionRef(fn?: any) {
  if (!fn) return undefined;
  if (!(fn instanceof Fn)) return undefined;
  return {
    node: fn.node.addr,
    stack: Stack.of(fn).node.id,
  };
}

export function isCDKConstructOf(
  construct: any,
  moduleName: string
): construct is Construct {
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

  const fqn = construct?.constructor?.[JSII_RTTI_SYMBOL_1]?.fqn;
  return (typeof fqn === "string") && fqn === moduleName;
}

export function isCDKConstruct(construct: any): construct is Construct {
  const fqn = construct?.constructor?.[JSII_RTTI_SYMBOL_1]?.fqn;
  return typeof fqn === "string" && (fqn.startsWith("@aws-cdk/") || fqn.startsWith("aws-cdk-lib"));
}