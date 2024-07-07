import { CustomResourceOptions, Input, dynamic } from "@pulumi/pulumi";
import { awsFetch } from "../helpers/client.js";

// CloudFront allows you to specify up to 3,000 paths in a single invalidation
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html#limits-invalidations
const FILE_LIMIT = 3000;
const WILDCARD_LIMIT = 15;

export interface DistributionInvalidationInputs {
  distributionId: Input<Inputs["distributionId"]>;
  paths: Input<Inputs["paths"]>;
  wait: Input<Inputs["wait"]>;
  version: Input<Inputs["version"]>;
}

interface Inputs {
  distributionId: string;
  paths: string[];
  wait: boolean;
  version: string;
}

class Provider implements dynamic.ResourceProvider {
  async create(inputs: Inputs): Promise<dynamic.CreateResult> {
    await this.handle(inputs);
    return { id: "invalidation" };
  }

  async update(
    id: string,
    olds: any,
    news: Inputs,
  ): Promise<dynamic.UpdateResult> {
    await this.handle(news);
    return {};
  }

  async handle(inputs: Inputs) {
    const ids = await this.invalidate(inputs);
    if (inputs.wait) {
      await this.waitForInvalidation(inputs, ids);
    }
  }

  async invalidate(inputs: Inputs) {
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
        await this.invalidateChunk(distributionId, stepPaths),
      );
    }
    return invalidationIds;
  }

  async invalidateChunk(distributionId: string, paths: string[]) {
    const result = await awsFetch(
      "cloudfront",
      `/distribution/${distributionId}/invalidation`,
      {
        method: "post",
        body: [
          `<InvalidationBatch xmlns="http://cloudfront.amazonaws.com/doc/2020-05-31/">`,
          `<CallerReference>${Date.now().toString()}</CallerReference>`,
          `<Paths>`,
          `<Items>`,
          ...paths.map((p) => `<Path>${p}</Path>`),
          `</Items>`,
          `<Quantity>${paths.length}</Quantity>`,
          `</Paths>`,
          `</InvalidationBatch>`,
        ].join(""),
      },
    );
    const invalidationId = result.Id;

    if (!invalidationId) {
      throw new Error("Invalidation ID not found");
    }

    return invalidationId;
  }

  async waitForInvalidation(inputs: Inputs, invalidationIds: string[]) {
    const { distributionId } = inputs;
    for (const invalidationId of invalidationIds) {
      try {
        const waitTill = Date.now() + 600000; // 10 minutes
        while (Date.now() < waitTill) {
          const result = await awsFetch(
            "cloudfront",
            `/distribution/${distributionId}/invalidation/${invalidationId}`,
            { method: "get" },
          );
          if (result.Status === "Completed") break;
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      } catch (e) {
        // supress errors
        //console.error(e);
      }
    }
  }
}

export class DistributionInvalidation extends dynamic.Resource {
  constructor(
    name: string,
    args: DistributionInvalidationInputs,
    opts?: CustomResourceOptions,
  ) {
    super(
      new Provider(),
      `${name}.sst.aws.DistributionInvalidation`,
      args,
      opts,
    );
  }
}
