import pulumi from "@pulumi/pulumi";
import {
  CloudFrontClient,
  CreateInvalidationCommand,
  waitUntilInvalidationCompleted,
} from "@aws-sdk/client-cloudfront";

// CloudFront allows you to specify up to 3,000 paths in a single invalidation
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html#limits-invalidations
const FILE_LIMIT = 3000;
const WILDCARD_LIMIT = 15;

export interface DistributionInvalidationInputs {
  distributionId: pulumi.Input<string>;
  paths?: pulumi.Input<string[]>;
  wait?: pulumi.Input<boolean>;
  version?: pulumi.Input<string>;
}

interface Inputs {
  distributionId: string;
  paths: string[];
  wait: boolean;
  version: string;
}

class Provider implements pulumi.dynamic.ResourceProvider {
  async create(inputs: Inputs): Promise<pulumi.dynamic.CreateResult> {
    await this.handle(inputs);
    return { id: "invalidation", outs: {} };
  }

  async update(
    id: string,
    olds: Inputs,
    news: Inputs,
  ): Promise<pulumi.dynamic.UpdateResult> {
    await this.handle(news);
    return { outs: {} };
  }

  async handle(inputs: Inputs) {
    const client = new CloudFrontClient();
    const ids = await this.invalidate(client, inputs);
    console.log("deciding to wait");
    if (inputs.wait) {
      await this.waitForInvalidation(client, inputs, ids);
    }
    console.log("done waiting");
  }

  async invalidate(client: CloudFrontClient, inputs: Inputs) {
    const { distributionId, paths } = inputs;

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
      Math.ceil(pathsWildcard.length / WILDCARD_LIMIT),
    );

    const invalidationIds: string[] = [];
    for (let i = 0; i < stepsCount; i++) {
      const stepPaths = [
        ...pathsFile.slice(i * FILE_LIMIT, (i + 1) * FILE_LIMIT),
        ...pathsWildcard.slice(i * WILDCARD_LIMIT, (i + 1) * WILDCARD_LIMIT),
      ];
      invalidationIds.push(
        await this.invalidateChunk(client, distributionId, stepPaths),
      );
    }
    return invalidationIds;
  }

  async invalidateChunk(
    client: CloudFrontClient,
    distributionId: string,
    paths: string[],
  ) {
    console.log("invalidating chunk", paths);

    const result = await client.send(
      new CreateInvalidationCommand({
        DistributionId: distributionId,
        InvalidationBatch: {
          CallerReference: Date.now().toString(),
          Paths: {
            Quantity: paths.length,
            Items: paths,
          },
        },
      }),
    );
    const invalidationId = result.Invalidation?.Id;

    if (!invalidationId) {
      throw new Error("Invalidation ID not found");
    }

    console.log("> invalidation id", invalidationId);
    return invalidationId;
  }

  async waitForInvalidation(
    client: CloudFrontClient,
    inputs: Inputs,
    invalidationIds: string[],
  ) {
    const { distributionId } = inputs;
    console.log("waiting for invalidations", invalidationIds);
    for (const invalidationId of invalidationIds) {
      console.log("> invalidation", invalidationId);
      try {
        console.log("starting wait", waitUntilInvalidationCompleted);
        await waitUntilInvalidationCompleted(
          {
            client: client,
            maxWaitTime: 600,
          },
          {
            DistributionId: distributionId,
            Id: invalidationId,
          },
        );
        console.log("done waiting for invalidation");
      } catch (e) {
        throw e;
        // supress errors
        console.error(e);
      }
    }
  }
}

export class DistributionInvalidation extends pulumi.dynamic.Resource {
  account!: pulumi.Output<string>;
  constructor(
    name: string,
    args: DistributionInvalidationInputs,
    opts?: pulumi.CustomResourceOptions,
  ) {
    super(
      new Provider(),
      name,
      {
        ...args,
        paths: pulumi
          .all([args.paths])
          .apply(([paths]) => [...new Set(paths ?? ["/*"])]),
        wait: args.wait || false,
        version:
          args.version ||
          Date.now().toString(16) + Math.random().toString(16).slice(2),
      },
      opts,
    );
  }
}
