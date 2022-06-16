import { Match, Matcher, MatchResult, Template } from "aws-cdk-lib/assertions";
import { Stack } from "aws-cdk-lib";

///////////////////////
// Matcher functions //
///////////////////////

export const ANY = Match.anyValue();
export const ABSENT = Match.absent();
export const not = Match.not;
export const arrayWith = Match.arrayWith;
export const objectLike = Match.objectLike;

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

export function printResource(stack: Stack, type: string): void {
  const template = Template.fromStack(stack);
  const resources = template.findResources(type);
  console.log(JSON.stringify(resources, null, 2));
}
