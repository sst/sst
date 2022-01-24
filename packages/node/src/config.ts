import SSM from "aws-sdk/clients/ssm.js";

const ssm = new SSM();
const result = await ssm
  .getParameters({
    Names: process.env.SSM_VALUES!.split(","),
    WithDecryption: true,
  })
  .promise();

const config: ConfigType = {};
for (const item of result.Parameters || []) {
  const splits = item.Name!.split("/");
  const last = splits[splits.length - 1];
  config[last] = item.Value!;
}

export interface ConfigType {
  [key: string]: string;
}

export const Config = new Proxy<ConfigType>(config, {
  get: (target, prop: string) => {
    if (prop in target) return target[prop];
    throw new Error(`Config ${prop} was not set`);
  },
});
