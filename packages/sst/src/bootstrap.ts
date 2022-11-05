import { GetParametersCommand, SSMClient } from "@aws-sdk/client-ssm";
import { Context } from "./context/context.js";
import { useAWSClient } from "./credentials.js";
import { Logger } from "./logger.js";

const SSM_NAME_VERSION = `/sst/bootstrap/version`;
const SSM_NAME_STACK_NAME = `/sst/bootstrap/stack-name`;
const SSM_NAME_BUCKET_NAME = `/sst/bootstrap/bucket-name`;

export const useBootstrap = Context.memo(async () => {
  Logger.debug("Initializing bootstrap context");
  const ssm = useAWSClient(SSMClient);
  const result = await ssm.send(
    new GetParametersCommand({
      Names: [SSM_NAME_VERSION, SSM_NAME_STACK_NAME, SSM_NAME_BUCKET_NAME],
    })
  );

  const ret = {
    version: result.Parameters!.find((p) => p.Name === SSM_NAME_VERSION)!.Value,
    bucket: result.Parameters!.find((p) => p.Name === SSM_NAME_BUCKET_NAME)!
      .Value,
    stack: result.Parameters!.find((p) => p.Name === SSM_NAME_STACK_NAME)!
      .Value,
  };
  Logger.debug("Loaded bootstrap info: ", JSON.stringify(ret));
  return ret;
});
