import {
  Input,
  ComponentResourceOptions,
  output,
  interpolate,
  jsonStringify,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { RandomId } from "@pulumi/random";
import { prefixName, hashNumberToString } from "./helpers/naming";
import { Component } from "./component";
import { Link } from "./link";
import { FunctionPermissionArgs } from ".";

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
  transform?: {
    bucket?: (args: aws.s3.BucketV2Args) => void;
    bucketPolicy?: (args: aws.s3.BucketPolicyArgs) => void;
  };
}

export class Bucket
  extends Component
  implements Link.Linkable, Link.AWS.Linkable
{
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
    const publicAccessBlock = createPublicAccess();
    createBucketPolicy();

    this.bucket = bucket;

    function createBucket() {
      const input: aws.s3.BucketV2Args = {
        forceDestroy: true,
      };
      args?.transform?.bucket?.(input);

      if (!input.bucket) {
        const randomId = new RandomId(
          `${name}Id`,
          { byteLength: 6 },
          { parent }
        );
        input.bucket = randomId.dec.apply((dec) =>
          prefixName(
            name.toLowerCase(),
            `-${hashNumberToString(parseInt(dec), 8)}`
          )
        );
      }

      return new aws.s3.BucketV2(`${name}Bucket`, input, { parent });
    }

    function createPublicAccess() {
      return publicAccess.apply((publicAccess) => {
        return new aws.s3.BucketPublicAccessBlock(
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
      });
    }

    function createBucketPolicy() {
      return publicAccess.apply((publicAccess) => {
        if (!publicAccess) return;

        const input = {
          bucket: bucket.bucket,
          policy: jsonStringify({
            Statement: [
              {
                Principal: "*",
                Effect: "Allow",
                Action: ["s3:GetObject"],
                Resource: [$util.interpolate`${bucket.arn}/*`],
              },
            ],
          }),
        };
        args?.transform?.bucketPolicy?.(input);

        new aws.s3.BucketPolicy(`${name}Policy`, input, {
          parent,
          dependsOn: publicAccessBlock,
        });
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

  public getSSTLink() {
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
