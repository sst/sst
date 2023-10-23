import {
  CloudFrontClient,
  CreateInvalidationCommand,
  waitUntilInvalidationCompleted,
} from "@aws-sdk/client-cloudfront";
import { useAWSClient } from "./util.js";

interface Props {
  distributionId: string;
  paths: string[];
  wait: "true" | "false";
}

const cf = useAWSClient(CloudFrontClient);

// CloudFront allows you to specify up to 3,000 paths in a single invalidation
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html#limits-invalidations
const FILE_LIMIT = 3000;
const WILDCARD_LIMIT = 15;

export async function CloudFrontInvalidator(cfnRequest: any) {
  switch (cfnRequest.RequestType) {
    case "Create":
    case "Update":
      const props = cfnRequest.ResourceProperties as unknown as Props;
      const ids = await invalidate(props);
      if (props.wait === "true") {
        await waitForInvalidation(props, ids);
      }
      break;
    case "Delete":
      break;
    default:
      throw new Error("Unsupported request type");
  }
}

async function invalidate(props: Props) {
  const { distributionId, paths } = props;

  // Split paths into files and wildcard paths
  const pathsFile: string[] = [];
  const pathsWildcard: string[] = [];
  for (const path of paths) {
    if (path.trim().endsWith("*")) {
      pathsWildcard.push(path);
    } else {
      pathsFile.push(path);
    }
  }

  const stepsCount: number = Math.max(
    Math.ceil(pathsFile.length / FILE_LIMIT),
    Math.ceil(pathsWildcard.length / WILDCARD_LIMIT)
  );

  const invalidationIds: string[] = [];
  for (let i = 0; i < stepsCount; i++) {
    const stepPaths = [
      ...pathsFile.slice(i * FILE_LIMIT, (i + 1) * FILE_LIMIT),
      ...pathsWildcard.slice(i * WILDCARD_LIMIT, (i + 1) * WILDCARD_LIMIT),
    ];
    invalidationIds.push(await invalidateChunk(distributionId, stepPaths));
  }
  return invalidationIds;
}

async function invalidateChunk(distributionId: string, paths: string[]) {
  console.log("invalidating chunk", paths);

  const result = await cf.send(
    new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: paths.length,
          Items: paths,
        },
      },
    })
  );
  const invalidationId = result.Invalidation?.Id;

  if (!invalidationId) {
    throw new Error("Invalidation ID not found");
  }

  console.log("> invalidation id", invalidationId);
  return invalidationId;
}

async function waitForInvalidation(props: Props, invalidationIds: string[]) {
  const { distributionId } = props;
  console.log("waiting for invalidations", invalidationIds);
  for (const invalidationId of invalidationIds) {
    console.log("> invalidation", invalidationId);
    try {
      await waitUntilInvalidationCompleted(
        {
          client: cf,
          maxWaitTime: 600,
        },
        {
          DistributionId: distributionId,
          Id: invalidationId,
        }
      );
    } catch (e) {
      // supress errors
      console.error(e);
    }
  }
}
