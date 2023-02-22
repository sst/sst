import { createProxy, getVariables } from "../util/index.js";

export interface ParameterResources {}
export interface SecretResources {}

export interface ConfigTypes {}
export type ParameterTypes = {
  [T in keyof ParameterResources]: string;
};
export type SecretTypes = {
  [T in keyof SecretResources]: string;
};

export const Config = createProxy<ConfigTypes & ParameterTypes & SecretTypes>(
  "Config"
);
const metadata = parseMetadataEnvironment();
const parameters = flattenValues(getVariables("Parameter"));
const secrets = flattenValues(getVariables("Secret"));
Object.assign(Config, metadata, parameters, secrets);

///////////////
// Functions
///////////////

function parseMetadataEnvironment() {
  // If SST_APP and SST_STAGE are not set, it is likely the
  // user is using an older version of SST.
  const errorMsg =
    "This is usually the case when you are using an older version of SST. Please update SST to the latest version to use the SST Config feature.";
  if (!process.env.SST_APP) {
    throw new Error(
      `Cannot find the SST_APP environment variable. ${errorMsg}`
    );
  }
  if (!process.env.SST_STAGE) {
    throw new Error(
      `Cannot find the SST_STAGE environment variable. ${errorMsg}`
    );
  }
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
