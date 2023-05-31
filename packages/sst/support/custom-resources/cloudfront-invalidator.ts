import {
  CloudFrontClient,
  CreateInvalidationCommand,
  waitUntilInvalidationCompleted,
} from "@aws-sdk/client-cloudfront";

const cf = new CloudFrontClient({ logger: console });

export async function CloudFrontInvalidator(cfnRequest: any) {
  switch (cfnRequest.RequestType) {
    case "Create":
    case "Update":
      const { distributionId, paths, waitForInvalidation } =
        cfnRequest.ResourceProperties;

      const id = await invalidate(distributionId, paths);
      if (waitForInvalidation === "true") {
        await wait(distributionId, id);
      }
      break;
    case "Delete":
      break;
    default:
      throw new Error("Unsupported request type");
  }
}

async function invalidate(distributionId: string, paths: string[]) {
  console.log("invalidate");

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

  return result.Invalidation.Id;
}

async function wait(distributionId: string, invalidationId: string) {
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
    // suppress errors
    console.error(e);
  }
}
