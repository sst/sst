import {
  Input,
  ComponentResourceOptions,
  output,
  interpolate,
  jsonStringify,
  Output,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { RandomId } from "@pulumi/random";
import { prefixName, hashNumberToString } from "./helpers/naming";
import { Component, Transform, transform } from "./component";
import { Link } from "./link";

/**
 * Arguments for creating a `Bucket` component.
 */
export interface BucketArgs {
  /**
   * Enable public access to the files in the bucket
   * @default `false` - Files are not publicly accessible
   * @example
   * ```js
   * {
   *   public: true
   * }
   * ```
   */
  public?: Input<boolean>;
  transform?: {
    bucket?: Transform<aws.s3.BucketV2Args>;
    bucketPolicy?: Transform<aws.s3.BucketPolicyArgs>;
  };
}

/**
 * The `Bucket` component is a higher level component that makes it easy to create an AWS S3 Bucket.
 *
 * @example
 *
 * #### Using the minimal config
 * ```ts
 * new sst.Bucket("MyBucket");
 * ```
 *
 * #### Enabling public read access
 * This allows anyone to read files in the bucket. This is useful for hosting public files.
 * ```ts
 * new sst.Bucket("MyBucket", {
 *   public: true,
 * });
 * ```
 */
export class Bucket
  extends Component
  implements Link.Linkable, Link.AWS.Linkable
{
  private bucket: aws.s3.BucketV2;

  constructor(
    name: string,
    args?: BucketArgs,
    opts?: ComponentResourceOptions,
  ) {
    super("sst:sst:Bucket", name, args, opts);

    const parent = this;
    const publicAccess = normalizePublicAccess();

    const bucket = createBucket();
    const publicAccessBlock = createPublicAccess();
    createBucketPolicy();

    this.bucket = bucket;

    function createBucket() {
      const input = transform(args?.transform?.bucket, {
        forceDestroy: true,
      });

      if (!input.bucket) {
        const randomId = new RandomId(
          `${name}Id`,
          { byteLength: 6 },
          { parent },
        );
        input.bucket = randomId.dec.apply((dec) =>
          prefixName(
            name.toLowerCase(),
            `-${hashNumberToString(parseInt(dec), 8)}`,
          ),
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
          { parent },
        );
      });
    }

    function createBucketPolicy() {
      return publicAccess.apply((publicAccess) => {
        if (!publicAccess) return;

        new aws.s3.BucketPolicy(
          `${name}Policy`,
          transform(args?.transform?.bucketPolicy, {
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
          }),
          {
            parent,
            dependsOn: publicAccessBlock,
          },
        );
      });
    }

    function normalizePublicAccess() {
      return output(args?.public).apply((v) => v ?? false);
    }
  }

  /**
   * The S3 bucket name.
   */
  public get name() {
    return this.bucket.bucket;
  }

  /**
   * The S3 bucket arn.
   */
  public get arn() {
    return this.bucket.arn;
  }

  /**
   * The underlying AWS resources.
   */
  public get nodes() {
    return {
      bucket: this.bucket,
    };
  }

  /** @internal */
  public getSSTLink() {
    return {
      type: `{ bucketName: string }`,
      value: {
        bucketName: this.name,
      },
    };
  }

  /** @internal */
  public getSSTAWSPermissions() {
    return [
      {
        actions: ["s3:*"],
        resources: [this.bucket.arn, interpolate`${this.bucket.arn}/*`],
      },
    ];
  }
}
