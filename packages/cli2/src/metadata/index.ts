import { useAWSClient } from "../credentials/index.js";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

async function get() {
  const ssm = await useAWSClient(SSMClient);
  const value = await ssm.send(
    new GetParameterCommand({
      Name: `/sst/bootstrap/bucket-name`,
    })
  );
  console.log(value);
}

export const Metadata = {
  get,
};
