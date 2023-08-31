import { CopyObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { CdkCustomResourceEvent } from "aws-lambda";
import path from "path";

interface Props {
  functions: [string, string][];
  bootstrap: string;
  bucket: string;
  app: string;
  stage: string;
}

const s3 = new S3Client({});
export async function FunctionSourcemapUploader(
  cfnRequest: CdkCustomResourceEvent
) {
  switch (cfnRequest.RequestType) {
    case "Create":
    case "Update":
      const old = (
        cfnRequest.RequestType === "Update"
          ? Object.fromEntries(cfnRequest.OldResourceProperties.functions)
          : {}
      ) as Props["functions"];
      const next = cfnRequest.ResourceProperties as unknown as Props;
      for (const [arn, key] of cfnRequest.ResourceProperties.functions) {
        if (old[arn] === key) continue;
        await s3.send(
          new CopyObjectCommand({
            Bucket: cfnRequest.ResourceProperties.bootstrap,
            ContentType: "application/json",
            CopySource: `/${next.bucket}/${key}`,
            ContentEncoding: "gzip",
            Key: `sourcemap/${next.app}/${next.stage}/${arn}/${
              path.parse(key).base
            }`,
          })
        );
      }
      break;
    case "Delete":
      break;
    default:
      throw new Error("Unsupported request type");
  }
}
