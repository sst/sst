import * as ssm from "aws-cdk-lib/aws-ssm";
import { SSTConstruct } from "../Construct.js";
import { App } from "../App.js";
import { Secret } from "../Secret.js";
import { Config } from "../../config.js";

export interface FunctionBindingProps {
  clientPackage: string;
  permissions: Record<string, string[]>;
  variables: Record<
    string,
    | {
        // value will be stored in environment variable and SSM
        // - environment: real value
        // - SSM parameter: real value
        // ie. Bucket's name
        type: "plain";
        value: string;
      }
    | {
        // value will be created in SSM manually by user
        // - environment: placeholder value
        // - SSM parameter: not created (user will create it manually)
        // ie. Secret's value
        type: "secret";
      }
    | {
        // value points to a Secret value
        // - environment: placeholder value with reference to Secret name
        // - SSM parameter: not created
        // ie. Auth's public key
        type: "secret_reference";
        secret: Secret;
      }
    | {
        // value will be stored in SSM
        // - environment: placeholder value
        // - SSM parameter: real value
        // ie. Site's url
        type: "site_url";
        value: string;
      }
  >;
}

export function bindEnvironment(c: SSTConstruct) {
  const binding = c.getFunctionBinding();

  let environment: Record<string, string> = {};
  if (binding) {
    Object.entries(binding.variables).forEach(([prop, variable]) => {
      const envName = getEnvironmentKey(c, prop);
      if (variable.type === "plain") {
        environment[envName] = variable.value;
      } else if (variable.type === "secret" || variable.type === "site_url") {
        environment[envName] = placeholderSecretValue();
      } else if (variable.type === "secret_reference") {
        environment[envName] = placeholderSecretReferenceValue(variable.secret);
      }
    });
  }

  return environment;
}

export function bindParameters(c: SSTConstruct) {
  const binding = c.getFunctionBinding();
  if (!binding) {
    return;
  }

  const app = c.node.root as App;
  Object.entries(binding.variables).forEach(([prop, variable]) => {
    if (variable.type !== "plain" && variable.type !== "site_url") return;

    const resId = `Parameter_${prop}`;
    if (!c.node.tryFindChild(resId)) {
      new ssm.StringParameter(c, resId, {
        parameterName: getParameterPath(c, prop),
        stringValue: variable.value,
      });
    }
  });
}

export function bindPermissions(c: SSTConstruct) {
  const binding = c.getFunctionBinding();
  if (!binding) {
    return {};
  }

  return c.getFunctionBinding()?.permissions || {};
}

export function bindType(c: SSTConstruct) {
  const binding = c.getFunctionBinding();
  if (!binding) {
    return;
  }

  return {
    clientPackage: binding.clientPackage,
    variables: Object.keys(binding.variables),
  };
}

export function getReferencedSecrets(c: SSTConstruct) {
  const binding = c.getFunctionBinding();
  const secrets: Secret[] = [];
  if (binding) {
    Object.values(binding.variables).forEach((variable) => {
      if (variable.type === "secret_reference") {
        secrets.push(variable.secret);
      }
    });
  }

  return secrets;
}

export function getEnvironmentKey(c: SSTConstruct, prop: string): string {
  return Config.envFor({
    type: c.constructor.name,
    id: c.id,
    prop: prop,
  });
}

export function getParameterPath(c: SSTConstruct, prop: string): string {
  const construct = c.constructor.name;
  return Config.pathFor({
    id: c.id,
    type: construct,
    prop: prop,
  });
}

export function getParameterFallbackPath(
  c: SSTConstruct,
  prop: string
): string {
  const construct = c.constructor.name;
  return Config.pathFor({
    id: c.id,
    type: construct,
    prop: prop,
    fallback: true,
  });
}

export function placeholderSecretValue() {
  return "__FETCH_FROM_SSM__";
}

export function placeholderSecretReferenceValue(secret: Secret) {
  return "__FETCH_FROM_SECRET__:" + secret.name;
}
