import { ComponentResourceOptions } from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";
import { Component, Transform, transform } from "../component";

export interface BucketArgs {
  /**
   * [Transform](/docs/components#transform/) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the R2 Bucket resource.
     */
    bucket?: Transform<cloudflare.R2BucketArgs>;
  };
}

/**
 * The `Bucket` component lets you add an [Cloudflare R2 Bucket](https://developers.cloudflare.com/r2/) to
 * your app.
 *
 * @example
 *
 * #### Minimal example
 *
 * ```ts
 * const bucket = new sst.cloudflare.Bucket("MyBucket");
 * ```
 *
 * #### Public read access
 *
 * Enable `public` read access for all the files in the bucket. Useful for hosting public files.
 *
 * ```ts
 * new sst.aws.Bucket("MyBucket", {
 *   public: true
 * });
 * ```
 *
 * #### Add a subscriber
 *
 * ```ts
 * bucket.subscribe("src/subscriber.handler");
 * ```
 *
 * #### Link the bucket to a resource
 *
 * You can link the bucket to other resources, like a function or your Next.js app.
 *
 * ```ts
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [bucket]
 * });
 * ```
 *
 * Once linked, you can generate a pre-signed URL to upload files in your app.
 *
 * ```ts title="app/page.tsx" {1,7}
 * import { Resource } from "sst";
 * import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
 * import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
 *
 * const command = new PutObjectCommand({
 *    Key: "file.txt",
 *    Bucket: Resource.MyBucket.name
 *  });
 *  await getSignedUrl(new S3Client({}), command);
 * ```
 */
export class Bucket extends Component {
  private bucket: cloudflare.R2Bucket;

  constructor(
    name: string,
    args?: BucketArgs,
    opts?: ComponentResourceOptions,
  ) {
    super("sst:cloudflare:Bucket", name, args, opts);

    const parent = this;

    const bucket = createBucket();

    this.bucket = bucket;

    function createBucket() {
      return new cloudflare.R2Bucket(
        `${name}Bucket`,
        transform(args?.transform?.bucket, {
          name,
          accountId: sst.cloudflare.DEFAULT_ACCOUNT_ID,
        }),
        { parent },
      );
    }
  }

  /**
   * The generated name of the R2 Bucket.
   */
  public get name() {
    return this.bucket.name;
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Cloudflare R2 Bucket.
       */
      bucket: this.bucket,
    };
  }
}
