import * as ssm from "aws-cdk-lib/aws-ssm";
import { SSTConstruct } from "../Construct.js";
import { App } from "../App.js";

export interface FunctionBindingProps {
  clientPackage: string;
  permissions: Record<string, string[]>;
  variables: Record<string, {
    // environments are used for 2 purposes:
    //  - pass binding values to the function (ie. bucket name)
    //  - pass placeholder value "1" to the custom resource (ie. secret)
    environment: string;
    parameter?: string;
  }>;
}

export function bindEnvironment(c: SSTConstruct) {
  const binding = c.getFunctionBinding();

  const environment: Record<string, string> = {};
  if (binding) {
    Object.entries(binding.variables).forEach(([prop, variable]) => {
      const envName = prop === "."
        ? `SST_${c.constructor.name}_${c.id}`
        : `SST_${c.constructor.name}_${prop}_${c.id}`;
      environment[envName] = variable.environment;
    });
  }

  return environment;
}

export function bindParameters(c: SSTConstruct) {
  const binding = c.getFunctionBinding();
  if (!binding) { return; }

  const app = c.node.root as App;
  Object.entries(binding.variables)
    .filter(([, variable]) => variable.parameter)
    .forEach(([prop, variable]) => {
      const resId = `Parameter_${prop}`;
      if (!c.node.tryFindChild(resId)) {
        const prefix = getParameterPathPrefix(c);
        new ssm.StringParameter(c, resId, {
          // Parameters, Secrets, and Jobs do not have a name
          parameterName: prop === "."
            ? `/sst/${app.name}/${app.stage}/${prefix}/${c.id}`
            : `/sst/${app.name}/${app.stage}/${prefix}/${c.id}/${prop}`,
          stringValue: variable.parameter!,
        });
      }
    });
}

export function bindPermissions(c: SSTConstruct) {
  return c.getFunctionBinding()?.permissions || {};
}

export function bindType(c: SSTConstruct) {
  const binding = c.getFunctionBinding();
  if (!binding) { return; }

  return {
    clientPackage: binding.clientPackage,
    variables: Object.keys(binding.variables),
  };
}

export function getParameterPath(c: SSTConstruct): string {
  const app = c.node.root as App;
  const prefix = getParameterPathPrefix(c);
  return `/sst/${app.name}/${app.stage}/${prefix}/${c.id}`;
}

export function getParameterFallbackPath(c: SSTConstruct): string {
  const app = c.node.root as App;
  const prefix = getParameterPathPrefix(c);
  return `/sst/${app.name}/.fallback/${prefix}/${c.id}`;
}

function getParameterPathPrefix(c: SSTConstruct): string {
  let prefix = c.constructor.name;
  return prefix === "Secret" ? "secrets" : prefix;
}