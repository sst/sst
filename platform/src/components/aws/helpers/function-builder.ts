import {
  all,
  ComponentResourceOptions,
  Input,
  Output,
  output,
} from "@pulumi/pulumi";
import { Function, FunctionArn, FunctionArgs } from "../function";
import { transform, Transform } from "../../component";
import { VisibleError } from "../../error";

export type FunctionBuilder = Output<{
  getFunction: () => Function;
  arn: Output<string>;
  invokeArn: Output<string>;
}>;

export function functionBuilder(
  name: string,
  definition: Input<string | FunctionArn | FunctionArgs>,
  override: Pick<FunctionArgs, "description" | "link" | "permissions">,
  argsTransform?: Transform<FunctionArgs>,
  opts?: ComponentResourceOptions,
): FunctionBuilder {
  return output(definition).apply((definition) => {
    if (typeof definition === "string") {
      // Case 1: The definition is an ARN
      if (definition.startsWith("arn:")) {
        return {
          getFunction: () => {
            throw new VisibleError(
              "Cannot access the created function because it is referenced as an ARN.",
            );
          },
          arn: output(definition),
          invokeArn: output(
            `arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/${definition}/invocations`,
          ),
        };
      }

      // Case 2: The definition is a handler
      const fn = new Function(
        ...transform(
          argsTransform,
          name,
          { handler: definition, ...override },
          opts || {},
        ),
      );
      return {
        getFunction: () => fn,
        arn: fn.arn,
        invokeArn: fn.nodes.function.invokeArn,
      };
    }

    // Case 3: The definition is a FunctionArgs
    else if (definition.handler) {
      const fn = new Function(
        ...transform(
          argsTransform,
          name,
          {
            ...definition,
            ...override,
            link: all([definition.link, override?.link]).apply(
              ([link, overrideLink]) => [
                ...(link ?? []),
                ...(overrideLink ?? []),
              ],
            ),
            permissions: all([
              definition.permissions,
              override?.permissions,
            ]).apply(([permissions, overridePermissions]) => [
              ...(permissions ?? []),
              ...(overridePermissions ?? []),
            ]),
          },
          opts || {},
        ),
      );
      return {
        getFunction: () => fn,
        arn: fn.arn,
        invokeArn: fn.nodes.function.invokeArn,
      };
    }
    throw new Error(`Invalid function definition for the "${name}" Function`);
  });
}
