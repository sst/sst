import {
  ComponentResourceOptions,
  output,
  interpolate,
  all,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { RandomId } from "@pulumi/random";
import { prefixName, hashNumberToString } from "../naming";
import { Component, Transform, transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";

export interface BucketArgs {
  /**
   * Enable public read access for all the files in the bucket.
   * @default `false`
   * @example
   * ```js
   * {
   *   public: true
   * }
   * ```
   */
  public?: Input<boolean>;
  /**
   * Enforces SSL for all requests.
   * @default `true`
   * @example
   * ```js
   * {
   *   enforceSsl: false
   * }
   * ```
   */
  enforceSsl?: Input<boolean>;
  /**
   * [Transform](/docs/components#transform/) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the S3 Bucket resource.
     */
    bucket?: Transform<aws.s3.BucketV2Args>;
    /**
     * Transform the IAM Policy that's attached to the Bucket.
     */
    bucketPolicy?: Transform<aws.s3.BucketPolicyArgs>;
  };
}

/**
 * The `Bucket` component lets you add an [AWS S3 Bucket](https://aws.amazon.com/s3/) to
 * your app.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts
 * new sst.aws.Bucket("MyBucket");
 * ```
 *
 * #### Public read access
 *
 * Enable `public` read access for all the files in the bucket. Useful for hosting public files.
 *
 * ```ts {2}
 * new sst.aws.Bucket("MyBucket", {
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
    super("sst:aws:Bucket", name, args, opts);

    const parent = this;
    const publicAccess = normalizePublicAccess();
    const enforceSsl = normalizeEnforceSsl();

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
      return all([publicAccess, enforceSsl]).apply(
        ([publicAccess, enforceSsl]) => {
          const statements = [];
          if (publicAccess) {
            statements.push({
              principals: [{ type: "*", identifiers: ["*"] }],
              actions: ["s3:GetObject"],
              resources: [interpolate`${bucket.arn}/*`],
            });
          }
          if (enforceSsl) {
            statements.push({
              effect: "Deny",
              principals: [{ type: "*", identifiers: ["*"] }],
              actions: ["s3:*"],
              resources: [bucket.arn, interpolate`${bucket.arn}/*`],
              conditions: [
                {
                  test: "Bool",
                  variable: "aws:SecureTransport",
                  values: ["false"],
                },
              ],
            });
          }

          if (statements.length === 0) return;

          new aws.s3.BucketPolicy(
            `${name}Policy`,
            transform(args?.transform?.bucketPolicy, {
              bucket: bucket.bucket,
              policy: aws.iam.getPolicyDocumentOutput({ statements }).json,
            }),
            {
              parent,
              dependsOn: publicAccessBlock,
            },
          );
        },
      );
    }

    function normalizePublicAccess() {
      return output(args?.public).apply((v) => v ?? false);
    }

    function normalizeEnforceSsl() {
      return output(args?.enforceSsl).apply((v) => v ?? true);
    }
  }

  /**
   * The generated name of the S3 Bucket.
   */
  public get name() {
    return this.bucket.bucket;
  }

  /**
   * The ARN of the S3 Bucket.
   */
  public get arn() {
    return this.bucket.arn;
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Amazon S3 bucket.
       */
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
