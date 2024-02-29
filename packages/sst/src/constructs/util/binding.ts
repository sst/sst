import * as ssm from "aws-cdk-lib/aws-ssm";
import { SSTConstruct, isSSTConstruct } from "../Construct.js";
import { Secret } from "../Secret.js";
import { Config } from "../../config.js";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";

export interface BindingProps {
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
        // - SSM parameter: placeholder value with reference to Secret name
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
    | {
        // used for future/auth as we need to pass in the auth_id with a
        // specific environment name
        type: "auth_id";
        value: string;
      }
  >;
}

export type BindingResource =
  | SSTConstruct
  | {
      resource: SSTConstruct;
      permissions: { actions: string[]; resources: string[] }[];
    };

export function getBindingEnvironments(r: BindingResource) {
  const c = isSSTConstruct(r) ? r : r.resource;
  const binding = c.getBindings();

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
      } else if (variable.type === "auth_id") {
        environment["AUTH_ID"] = variable.value;
      }
    });
  }

  return environment;
}

export function getBindingParameters(r: BindingResource) {
  const c = isSSTConstruct(r) ? r : r.resource;
  const binding = c.getBindings();
  if (!binding) {
    return;
  }

  Object.entries(binding.variables).forEach(([prop, variable]) => {
    const resId = `Parameter_${prop}`;
    if (!c.node.tryFindChild(resId)) {
      if (variable.type === "plain" || variable.type === "site_url") {
        new ssm.StringParameter(c, resId, {
          parameterName: getParameterPath(c, prop),
          stringValue: variable.value,
        });
      } else if (variable.type === "secret_reference") {
        new ssm.StringParameter(c, resId, {
          parameterName: getParameterPath(c, prop),
          stringValue: placeholderSecretReferenceValue(variable.secret),
        });
      }
    }
  });
}

export function getBindingPermissions(r: BindingResource) {
  if (isSSTConstruct(r)) {
    return Object.entries(r.getBindings()?.permissions ?? {}).map(
      ([action, resources]) =>
        new PolicyStatement({
          actions: [action],
          effect: Effect.ALLOW,
          resources,
        })
    );
  }

  return r.permissions.map((p) => {
    return new PolicyStatement({
      actions: p.actions,
      effect: Effect.ALLOW,
      resources: p.resources,
    });
  });
}

export function getBindingType(r: BindingResource) {
  const c = isSSTConstruct(r) ? r : r.resource;
  const binding = c.getBindings();
  if (!binding) {
    return;
  }

  return {
    clientPackage: binding.clientPackage,
    variables: Object.keys(binding.variables),
  };
}

export function getBindingReferencedSecrets(r: BindingResource) {
  const c = isSSTConstruct(r) ? r : r.resource;
  const binding = c.getBindings();
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
