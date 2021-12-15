/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable prefer-const */
import { Construct } from "@aws-cdk/core";
import { Function } from "./Function";
import { Script, ScriptProps } from "./Script";
import { NodejsFunction, NodejsFunctionProps } from "./NodejsFunction";

/**
 * Compatibility layer between SST.Function and NodejsFunction
 */
export class NodejsScript extends Script {
  constructor(scope: Construct, id: string, props: ScriptProps) {
    let { ...rest } = props;

    super(scope, id, rest);
  }

  override createUserFunction(type: string, fnDef?: any): Function | undefined {
    if (!fnDef) {
      return;
    }
    return fnDef as Function;

    return new NodejsFunction(this, `${type}Function`, {
      // timeout: 900,
      // timeout: 20,
      ...(this.props.defaultFunctionProps as any),
      ...fnDef,
    }) as Function;
  }
}
