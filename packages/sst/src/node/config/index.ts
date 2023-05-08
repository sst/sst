import { createProxy, getVariables2 } from "../util/index.js";

export interface ParameterResources {}
export interface SecretResources {}

export interface ConfigTypes {}
export type ParameterTypes = {
  [T in keyof ParameterResources]: string;
};
export type SecretTypes = {
  [T in keyof SecretResources]: string;
};

export const Config = /* @__PURE__ */ createProxy<
  ConfigTypes & ParameterTypes & SecretTypes
>("Config");
const metadata = parseMetadataEnvironment();
const parameters = flattenValues(getVariables2("Parameter"));
const secrets = flattenValues(getVariables2("Secret"));
Object.assign(Config, metadata, parameters, secrets);

///////////////
// Functions
///////////////

function parseMetadataEnvironment() {
  return {
    APP: process.env.SST_APP,
    STAGE: process.env.SST_STAGE,
  };
}

function flattenValues(configValues: Record<string, Record<string, string>>) {
  const acc: Record<string, string> = {};
  Object.keys(configValues).forEach((name) => {
    acc[name] = configValues[name].value;
  });
  return acc;
}
