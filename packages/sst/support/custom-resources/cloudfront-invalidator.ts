import {
  CloudFrontClient,
  CreateInvalidationCommand,
  waitUntilInvalidationCompleted,
} from "@aws-sdk/client-cloudfront";
import { sdkLogger } from "./util.js";

const cf = new CloudFrontClient({ logger: sdkLogger });

// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html#limits-invalidations
const limitFile = 3000;
const limitWildcard = 15;

export async function CloudFrontInvalidator(cfnRequest: any) {
  switch (cfnRequest.RequestType) {
    case "Create":
    case "Update":
      await invalidate(cfnRequest);
      break;
    case "Delete":
      break;
    default:
      throw new Error("Unsupported request type");
  }
}

async function invalidate(cfnRequest: any) {
  const { distributionId, paths, waitForInvalidation } =
    cfnRequest.ResourceProperties;

  const pathsFile: string[] = [];
  const pathsWildcard: string[] = [];
  for (let i = 0; i < paths.length; i++) {
    if (paths[i].trim().endsWith("*")) {
      pathsWildcard.push(paths[i]);
    } else {
      pathsFile.push(paths[i]);
    }
  }

  const stepsCount: number = Math.max(
    Math.ceil(pathsFile.length / limitFile),
    Math.ceil(pathsWildcard.length / limitWildcard)
  );

  const invalidationIds: string[] = [];
  for (let i = 0; i < stepsCount; i++) {
    const stepPaths: string[] = [];
    stepPaths.push(...pathsFile.slice(i * limitFile, (i + 1) * limitFile));
    stepPaths.push(
      ...pathsWildcard.slice(i * limitWildcard, (i + 1) * limitWildcard)
    );

    invalidationIds.push(await invalidateChunk(distributionId, stepPaths));

    // https://github.com/aws/aws-sdk-js/issues/3983#issuecomment-1617270477
    if (i < stepsCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  if (waitForInvalidation === "true") {
    await wait(distributionId, invalidationIds);
  }
}

async function invalidateChunk(distributionId: string, paths: string[]) {
  console.log("invalidate chunk: " + paths);

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

  if (!result.Invalidation?.Id) {
    throw new Error("Invalidation ID not found");
  }

  console.log("invalidateChunk return: " + result.Invalidation.Id);
  return result.Invalidation.Id;
}

async function wait(distributionId: string, invalidationIds: string[]) {
  console.log("invalidationIds: " + invalidationIds);
  for (let i = 0; i < invalidationIds.length; i++) {
    console.log("waiting invalidation: " + invalidationIds[i]);
    try {
      await waitUntilInvalidationCompleted(
        {
          client: cf,
          maxWaitTime: 600,
        },
        {
          DistributionId: distributionId,
          Id: invalidationIds[i],
        }
      );
    } catch (e) {
      // supress errors
      console.error(e);
    }
  }
}
