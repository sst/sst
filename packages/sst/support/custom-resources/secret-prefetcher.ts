import {
  LambdaClient,
  GetFunctionCommand,
  UpdateFunctionConfigurationCommand,
} from "@aws-sdk/client-lambda";
import { CdkCustomResourceEvent } from "aws-lambda";
import { sdkLogger } from "./util.js";
import { parseEnvironment } from "../../src/node/util/index.js";

interface Props {
  functionName: string;
}

const lambda = new LambdaClient({ logger: sdkLogger });

export async function SecretPrefetcher(cfnRequest: CdkCustomResourceEvent) {
  switch (cfnRequest.RequestType) {
    case "Create":
    case "Update":
      const props = cfnRequest.ResourceProperties as unknown as Props;
      const processEnvBackup = { ...process.env };

      try {
        // Get binding envs
        const ret = await lambda.send(
          new GetFunctionCommand({
            FunctionName: props.functionName,
          })
        );
        const envs = ret.Configuration?.Environment?.Variables ?? {};
        Object.entries(envs)
          .filter(
            ([key, _value]) =>
              key === "SST_APP" ||
              key === "SST_STAGE" ||
              key === "SST_SSM_PREFIX" ||
              key.startsWith("SST_Secret_value_")
          )
          .forEach(([key, value]) => {
            process.env[key] = key.startsWith("SST_Secret_value_")
              ? "__FETCH_FROM_SSM__"
              : value;
          });

        // Fetch values
        const allVariables = await parseEnvironment();

        // Update function envs
        Object.entries(allVariables["Secret"] ?? {}).map(([key, value]) => {
          envs[`SST_Secret_value_${key}`] = value.value.toString();
        });
        await lambda.send(
          new UpdateFunctionConfigurationCommand({
            FunctionName: props.functionName,
            Environment: {
              Variables: envs,
            },
          })
        );
      } finally {
        process.env = processEnvBackup;
      }

      break;
    case "Delete":
      break;
    default:
      throw new Error("Unsupported request type");
  }
}
