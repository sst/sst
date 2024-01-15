import {
  Input,
  ComponentResourceOptions,
  output,
  Output,
  all,
  interpolate,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { RandomId } from "@pulumi/random";
import { prefixName, hashNumberToString } from "./helpers/naming";
import { Component } from "./component";
import { AWSLinkable, Link, Linkable } from "./link";
import { FunctionPermissionArgs } from ".";
import { create } from "domain";

/**
 * Properties to create a DNS validated certificate managed by AWS Certificate Manager.
 */
export interface BucketArgs {
  /**
   * Enable public access to the files in the bucket
   * @default false
   * @example
   * ```js
   * {
   *   public: true
   * }
   * ```
   */
  public?: Input<boolean>;
  nodes?: {
    bucket?: aws.s3.BucketV2Args;
  };
}

export class Bucket extends Component implements Linkable, AWSLinkable {
  public bucket: aws.s3.BucketV2;

  constructor(
    name: string,
    args?: BucketArgs,
    opts?: ComponentResourceOptions
  ) {
    super("sst:sst:Bucket", name, args, opts);

    const parent = this;
    const publicAccess = normalizePublicAccess();

    const bucket = createBucket();
    createPublicAccess();

    this.bucket = bucket;

    function createBucket() {
      const randomId = new RandomId(`${name}Id`, { byteLength: 6 }, { parent });

      return new aws.s3.BucketV2(
        `${name}Bucket`,
        {
          bucket: randomId.dec.apply((dec) =>
            prefixName(
              name.toLowerCase(),
              `-${hashNumberToString(parseInt(dec), 8)}`
            )
          ),
          forceDestroy: true,
          ...args?.nodes?.bucket,
        },
        {
          parent,
        }
      );
    }

    function createPublicAccess() {
      publicAccess.apply((publicAccess) => {
        const publicAccessBlock = new aws.s3.BucketPublicAccessBlock(
          `${name}PublicAccessBlock`,
          {
            bucket: bucket.bucket,
            blockPublicAcls: true,
            blockPublicPolicy: !publicAccess,
            ignorePublicAcls: true,
            restrictPublicBuckets: !publicAccess,
          },
          { parent }
        );

        if (!publicAccess) return;

        new aws.s3.BucketPolicy(
          `${name}Policy`,
          {
            bucket: bucket.bucket,
            policy: aws.iam.getPolicyDocumentOutput({
              statements: [
                {
                  principals: [
                    {
                      type: "*",
                      identifiers: ["*"],
                    },
                  ],
                  actions: ["s3:GetObject"],
                  resources: [$util.interpolate`${bucket.arn}/*`],
                },
              ],
            }).json,
          },
          { parent, dependsOn: publicAccessBlock }
        );
      });
    }

    function normalizePublicAccess() {
      return output(args?.public).apply((v) => v ?? false);
    }
  }

  public get name() {
    return this.bucket.bucket;
  }

  public get arn() {
    return this.bucket.arn;
  }

  public get nodes() {
    return {
      bucket: this.bucket,
    };
  }

  public getSSTLink(): Link {
    return {
      type: `{ bucketName: string }`,
      value: {
        bucketName: this.name,
      },
    };
  }

  public getSSTAWSPermissions(): FunctionPermissionArgs {
    return {
      actions: ["s3:*"],
      resources: [this.bucket.arn, interpolate`${this.bucket.arn}/*`],
    };
  }
}
