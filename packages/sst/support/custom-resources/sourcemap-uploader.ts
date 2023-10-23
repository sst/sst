import { CopyObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { CdkCustomResourceEvent } from "aws-lambda";
import path from "path";
import { sdkLogger } from "./util.js";

interface Props {
  app: string;
  stage: string;
  srcBucket: string;
  tarBucket: string;
  sourcemaps: [string, string][];
}

const s3 = new S3Client({ logger: sdkLogger });
export async function SourcemapUploader(cfnRequest: CdkCustomResourceEvent) {
  switch (cfnRequest.RequestType) {
    case "Create":
    case "Update":
      const old = (
        cfnRequest.RequestType === "Update"
          ? Object.fromEntries(cfnRequest.OldResourceProperties.sourcemaps)
          : {}
      ) as Props["sourcemaps"];
      const next = cfnRequest.ResourceProperties as unknown as Props;
      for (const [tarKey, srcKey] of cfnRequest.ResourceProperties.sourcemaps) {
        if (old[tarKey] === srcKey) continue;
        await s3.send(
          new CopyObjectCommand({
            Bucket: next.tarBucket,
            ContentType: "application/json",
            CopySource: `/${next.srcBucket}/${srcKey}`,
            ContentEncoding: "gzip",
            Key: `sourcemap/${next.app}/${next.stage}/${tarKey}/${
              path.parse(srcKey).base
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
