import { GetParametersByPathCommand, SSMClient } from "@aws-sdk/client-ssm";
import { useProject } from "@core/app";
import { useAWSClient } from "@core/credentials.js";

export async function Secrets() {
  const ssm = useAWSClient(SSMClient);
  const project = useProject();
  const path = `/sst/${project.name}/${project.stage}/secrets/`;
  const result = await ssm.send(
    new GetParametersByPathCommand({
      Path: path,
      Recursive: true,
      WithDecryption: true,
    })
  );
  result.Parameters?.map((p) => console.log(p.Name, p.Value));
}
