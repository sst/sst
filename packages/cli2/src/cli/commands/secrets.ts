import { GetParametersByPathCommand, SSMClient } from "@aws-sdk/client-ssm";
import { useConfig } from "../../config/index.js";
import { useAWSClient } from "../../credentials/index.js";

export async function Secrets() {
  const ssm = await useAWSClient(SSMClient);
  const config = await useConfig();
  const path = `/sst/${config.name}/${config.stage}/secrets/`;
  const result = await ssm.send(
    new GetParametersByPathCommand({
      Path: path,
      Recursive: true,
      WithDecryption: true,
    })
  );
  result.Parameters?.map((p) => console.log(p.Name, p.Value));
}
