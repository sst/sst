import { Match, Matcher, MatchResult, Template } from "aws-cdk-lib/assertions";
import { Stack } from "aws-cdk-lib";
import { App } from "../../dist/constructs";
import { ProjectContext, useProject } from "../../dist/project.js";
import { resolve } from "path";
import { BootstrapContext } from "../../dist/bootstrap";
import { useNodeHandler } from "../../dist/runtime/handlers/node.js";
import { usePythonHandler } from "../../dist/runtime/handlers/python.js";
import { useDotnetHandler } from "../../dist/runtime/handlers/dotnet.js";
import { useJavaHandler } from "../../dist/runtime/handlers/java.js";
import { useGoHandler } from "../../dist/runtime/handlers/go.js";

///////////////////////
// Matcher functions //
///////////////////////

export const ANY = Match.anyValue();
export const ABSENT = Match.absent();
export const not = Match.not;
export const arrayWith = Match.arrayWith;
export const objectLike = Match.objectLike;

export async function createApp() {
  ProjectContext.provide({
    version: "test",
    cdkVersion: "test",
    stacks: async () => {},
    metafile: null as any,
    config: {
      stage: "test",
      name: "app",
      ssmPrefix: "/test/test/",
      region: "us-east-1",
    },
    paths: {
      root: resolve("test/constructs/"),
      out: resolve("test/constructs/.sst"),
      config: resolve("test/constructs/sst.config.ts"),
      artifacts: resolve("test/constructs/.sst/artifacts"),
    },
  });
  const project = useProject();

  BootstrapContext.provide({
    version: "test",
    bucket: "test",
  });

  await useNodeHandler();
  await usePythonHandler();
  await useDotnetHandler();
  await useJavaHandler();
  await useGoHandler();

  return new App({
    mode: "deploy",
    stage: project.config.stage,
    name: project.config.name,
    region: project.config.region,
  });
}

export function stringLike(pattern: RegExp): Matcher {
  return new StringMatch("stringLike", pattern);
}

class StringMatch extends Matcher {
  constructor(public readonly name: string, private readonly pattern: RegExp) {
    super();
  }

  public test(actual: any): MatchResult {
    const result = new MatchResult(actual);
    if (!actual.match(this.pattern)) {
      result.recordFailure({
        matcher: this,
        path: [],
        message: `Expected ${this.pattern} but received ${actual}`,
      });
    }
    return result;
  }
}

////////////////////////
// Template functions //
////////////////////////

export function countResources(
  stack: Stack,
  type: string,
  count: number
): void {
  // Each stack has a Lambda function "MetadataUploader", ignore it
  if (type === "AWS::Lambda::Function" || type === "AWS::IAM::Role") {
    count = count + 1;
  }
  const template = Template.fromStack(stack);
  template.resourceCountIs(type, count);
}

export function countResourcesLike(
  stack: Stack,
  type: string,
  count: number,
  props: any
): void {
  const template = Template.fromStack(stack);
  const resources = template.findResources(
    type,
    Match.objectLike({
      Properties: props,
    })
  );
  const counted = Object.keys(resources).length;
  if (counted !== count) {
    throw new Error(
      `Expected ${count} resources of type ${type} but found ${counted}`
    );
  }
}

export function hasResource(stack: Stack, type: string, props: any): void {
  const template = Template.fromStack(stack);
  template.hasResourceProperties(type, props);
}

export function hasResourceTemplate(
  stack: Stack,
  type: string,
  props: any
): void {
  const template = Template.fromStack(stack);
  template.hasResource(type, props);
}

export function hasOutput(stack: Stack, logicalId: string, props: any): void {
  const template = Template.fromStack(stack);
  template.hasOutput(logicalId, props);
}

export function templateMatches(stack: Stack, props: any): void {
  const template = Template.fromStack(stack);
  template.templateMatches(props);
}

export function printResource(stack: Stack, type: string): void {
  const template = Template.fromStack(stack);
  const resources = template.findResources(type);
  console.log(JSON.stringify(resources, null, 2));
}
