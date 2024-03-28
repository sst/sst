import {
  ComponentResourceOptions,
  output,
  interpolate,
  all,
  Output,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { RandomId } from "@pulumi/random";
import {
  prefixName,
  hashNumberToPrettyString,
  hashStringToPrettyString,
  sanitizeToPascalCase,
} from "../naming";
import { Component, Prettify, Transform, transform } from "../component";
import { Link } from "../link";
import type { Input } from "../input";
import { Function, FunctionArgs } from "./function";
import { Duration, toSeconds } from "../duration";

interface BucketCorsArgs {
  /**
   * The HTTP headers that origins can include in requests to the bucket.
   * @default `["*"]`
   * @example
   * ```js
   * {
   *   cors: {
   *     allowHeaders: ["date", "keep-alive", "x-custom-header"]
   *   }
   * }
   * ```
   */
  allowHeaders?: Input<Input<string>[]>;
  /**
   * The origins that can access the bucket.
   * @default `["*"]`
   * @example
   * ```js
   * {
   *   cors: {
   *     allowOrigins: ["https://www.example.com", "http://localhost:60905"]
   *   }
   * }
   * ```
   * Or the wildcard for all origins.
   * ```js
   * {
   *   cors: {
   *     allowOrigins: ["*"]
   *   }
   * }
   * ```
   */
  allowOrigins?: Input<Input<string>[]>;
  /**
   * The HTTP methods that are allowed when calling the bucket.
   * @default `["DELETE" | "GET" | "HEAD" | "POST" | "PUT"]`
   * @example
   * ```js
   * {
   *   cors: {
   *     allowMethods: ["GET", "POST", "DELETE"]
   *   }
   * }
   * ```
   */
  allowMethods?: Input<Input<"DELETE" | "GET" | "HEAD" | "POST" | "PUT">[]>;
  /**
   * The HTTP headers you want to expose to an origin that calls the bucket.
   * @default `[]`
   * @example
   * ```js
   * {
   *   cors: {
   *     exposeHeaders: ["date", "keep-alive", "x-custom-header"]
   *   }
   * }
   * ```
   */
  exposeHeaders?: Input<Input<string>[]>;
  /**
   * The maximum amount of time the browser can cache results of a preflight request. By
   * default the browser doesn't cache the results. The maximum value is `86400 seconds` or `1 day`.
   * @default `"0 seconds"`
   * @example
   * ```js
   * {
   *   cors: {
   *     maxAge: "1 day"
   *   }
   * }
   * ```
   */
  maxAge?: Input<Duration>;
}

export interface BucketArgs {
  /**
   * Enable public read access for all the files in the bucket.
   *
   * :::tip
   * You don't need to enable this if you're using CloudFront to serve files from the bucket.
   * :::
   *
   * Should only be turned on if you want to host public files directly from the bucket.
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
   * The CORS configuration for the bucket. Defaults to `true`, which is the same as:
   *
   * ```js
   * {
   *   cors: {
   *     allowHeaders: ["*"],
   *     allowOrigins: ["*"],
   *     allowMethods: ["DELETE", "GET", "HEAD", "POST", "PUT"],
   *     exposeHeaders: [],
   *     maxAge: "0 seconds"
   *   }
   * }
   * ```
   *
   * @default `true`
   */
  cors?: Input<false | Prettify<BucketCorsArgs>>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the S3 Bucket resource.
     */
    bucket?: Transform<aws.s3.BucketV2Args>;
    /**
     * Transform the S3 Bucket CORS configuration resource.
     */
    cors?: Transform<aws.s3.BucketCorsConfigurationV2Args>;
    /**
     * Transform the S3 Bucket Policy resource.
     */
    policy?: Transform<aws.s3.BucketPolicyArgs>;
    /**
     * Transform the public access block resource that's attached to the Bucket.
     */
    publicAccessBlock?: Transform<aws.s3.BucketPublicAccessBlockArgs>;
  };
}

export interface BucketSubscribeArgs {
  /**
   * The S3 event types that will trigger the notification.
   * @default All S3 events
   * @example
   * ```js
   * {
   *   events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
   * }
   * ```
   */
  events?: Input<
    Input<
      | "s3:ObjectCreated:*"
      | "s3:ObjectCreated:Put"
      | "s3:ObjectCreated:Post"
      | "s3:ObjectCreated:Copy"
      | "s3:ObjectCreated:CompleteMultipartUpload"
      | "s3:ObjectRemoved:*"
      | "s3:ObjectRemoved:Delete"
      | "s3:ObjectRemoved:DeleteMarkerCreated"
      | "s3:ObjectRestore:*"
      | "s3:ObjectRestore:Post"
      | "s3:ObjectRestore:Completed"
      | "s3:ObjectRestore:Delete"
      | "s3:ReducedRedundancyLostObject"
      | "s3:Replication:*"
      | "s3:Replication:OperationFailedReplication"
      | "s3:Replication:OperationMissedThreshold"
      | "s3:Replication:OperationReplicatedAfterThreshold"
      | "s3:Replication:OperationNotTracked"
      | "s3:LifecycleExpiration:*"
      | "s3:LifecycleExpiration:Delete"
      | "s3:LifecycleExpiration:DeleteMarkerCreated"
      | "s3:LifecycleTransition"
      | "s3:IntelligentTiering"
      | "s3:ObjectTagging:*"
      | "s3:ObjectTagging:Put"
      | "s3:ObjectTagging:Delete"
      | "s3:ObjectAcl:Put"
    >[]
  >;
  /**
   * An S3 object key prefix that will trigger the notification.
   * @example
   * All the objects in the `images/` folder.
   * ```js
   * {
   *   filterPrefix: "images/"
   * }
   * ```
   */
  filterPrefix?: Input<string>;
  /**
   * An S3 object key suffix that will trigger the notification.
   * @example
   * All the objects with the `.jpg` suffix.
   * ```js
   * {
   *  filterSuffix: ".jpg"
   * }
   * ```
   */
  filterSuffix?: Input<string>;
  /**
   * [Transform](/docs/components#transform) how this notification creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the S3 Bucket Notification resource.
     */
    notification?: Transform<aws.s3.BucketNotificationArgs>;
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
 * const bucket = new sst.aws.Bucket("MyBucket");
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
export class Bucket
  extends Component
  implements Link.Linkable, Link.AWS.Linkable
{
  private constructorName: string;
  private bucket: Output<aws.s3.BucketV2>;

  constructor(
    name: string,
    args?: BucketArgs,
    opts?: ComponentResourceOptions,
  ) {
    super("sst:aws:Bucket", name, args, opts);

    const parent = this;
    const publicAccess = normalizePublicAccess();

    const bucket = createBucket();
    const publicAccessBlock = createPublicAccess();
    const policy = createBucketPolicy();
    createCorsRule();

    this.constructorName = name;
    // Ensure the policy is created when the bucket is used in another component
    // (ie. bucket.name). Also, a bucket can only have one policy. We want to ensure
    // the policy created here is created first. And SST will throw an error if
    // another policy is created after this one.
    this.bucket = policy.apply(() => bucket);

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
            63,
            name,
            `-${hashNumberToPrettyString(parseInt(dec), 8)}`,
          ).toLowerCase(),
        );
      }

      return new aws.s3.BucketV2(`${name}Bucket`, input, { parent });
    }

    function createPublicAccess() {
      return publicAccess.apply((publicAccess) => {
        return new aws.s3.BucketPublicAccessBlock(
          `${name}PublicAccessBlock`,
          transform(args?.transform?.publicAccessBlock, {
            bucket: bucket.bucket,
            blockPublicAcls: true,
            blockPublicPolicy: !publicAccess,
            ignorePublicAcls: true,
            restrictPublicBuckets: !publicAccess,
          }),
          { parent },
        );
      });
    }

    function createBucketPolicy() {
      return publicAccess.apply((publicAccess) => {
        const statements = [];
        if (publicAccess) {
          statements.push({
            principals: [{ type: "*", identifiers: ["*"] }],
            actions: ["s3:GetObject"],
            resources: [interpolate`${bucket.arn}/*`],
          });
        }
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

        return new aws.s3.BucketPolicy(
          `${name}Policy`,
          transform(args?.transform?.policy, {
            bucket: bucket.bucket,
            policy: aws.iam.getPolicyDocumentOutput({ statements }).json,
          }),
          {
            parent,
            dependsOn: publicAccessBlock,
          },
        );
      });
    }

    function createCorsRule() {
      return output(args?.cors).apply((cors) => {
        if (cors === false) return;

        return new aws.s3.BucketCorsConfigurationV2(
          `${name}Cors`,
          transform(args?.transform?.cors, {
            bucket: bucket.bucket,
            corsRules: [
              {
                allowedHeaders: cors?.allowHeaders ?? ["*"],
                allowedMethods: cors?.allowMethods ?? [
                  "DELETE",
                  "GET",
                  "HEAD",
                  "POST",
                  "PUT",
                ],
                allowedOrigins: cors?.allowOrigins ?? ["*"],
                exposeHeaders: cors?.exposeHeaders,
                maxAgeSeconds: toSeconds(cors?.maxAge ?? "0 seconds"),
              },
            ],
          }),
          { parent },
        );
      });
    }

    function normalizePublicAccess() {
      return output(args?.public).apply((v) => v ?? false);
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

  /**
   * Subscribes to events from this bucket.
   *
   * @param subscriber The function that'll be notified.
   * @param args Configure the subscription.
   *
   * @example
   *
   * ```js
   * bucket.subscribe("src/subscriber.handler");
   * ```
   *
   * Add multiple subscribers.
   *
   * ```js
   * bucket
   *   .subscribe("src/subscriber1.handler")
   *   .subscribe("src/subscriber2.handler");
   * ```
   *
   * Subscribe to specific S3 events.
   *
   * ```js
   * bucket.subscribe("src/subscriber.handler", {
   *   events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
   * });
   * ```
   *
   * Subscribe to specific S3 events from a specific folder.
   *
   * ```js
   * bucket.subscribe("src/subscriber.handler", {
   *   filterPrefix: "images/",
   *   events: ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
   * });
   * ```
   *
   * Customize the subscriber function.
   *
   * ```js
   * bucket.subscribe({
   *   handler: "src/subscriber.handler",
   *   timeout: "60 seconds",
   * });
   * ```
   */
  public subscribe(
    subscriber: string | FunctionArgs,
    args?: BucketSubscribeArgs,
  ) {
    const parent = this;
    const parentName = this.constructorName;

    all([subscriber, args]).apply(([subscriber, args]) => {
      const events = args?.events ?? [
        "s3:ObjectCreated:*",
        "s3:ObjectRemoved:*",
        "s3:ObjectRestore:*",
        "s3:ReducedRedundancyLostObject",
        "s3:Replication:*",
        "s3:LifecycleExpiration:*",
        "s3:LifecycleTransition",
        "s3:IntelligentTiering",
        "s3:ObjectTagging:*",
        "s3:ObjectAcl:Put",
      ];

      // Build subscriber name
      const id = sanitizeToPascalCase(
        hashStringToPrettyString(
          [
            ...events,
            args?.filterPrefix ?? "",
            args?.filterSuffix ?? "",
            typeof subscriber === "string" ? subscriber : subscriber.handler,
          ].join(""),
          4,
        ),
      );

      const fn = Function.fromDefinition(
        parent,
        `${parentName}Subscriber${id}`,
        subscriber,
        {
          description:
            events.length < 5
              ? `Subscribed to ${parentName} on ${events.join(", ")}`
              : `Subscribed to ${parentName} on ${events
                  .slice(0, 3)
                  .join(", ")}, and ${events.length - 3} more events`,
        },
      );
      const permission = new aws.lambda.Permission(
        `${parentName}Subscriber${id}Permissions`,
        {
          action: "lambda:InvokeFunction",
          function: fn.arn,
          principal: "s3.amazonaws.com",
          sourceArn: this.arn,
        },
        { parent },
      );
      new aws.s3.BucketNotification(
        `${parentName}Notification${id}`,
        transform(args?.transform?.notification, {
          bucket: this.bucket.bucket,
          lambdaFunctions: [
            {
              id: `Notification${id}`,
              lambdaFunctionArn: fn.arn,
              events,
              filterPrefix: args?.filterPrefix,
              filterSuffix: args?.filterSuffix,
            },
          ],
        }),
        { parent, dependsOn: [permission] },
      );
    });
    return this;
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        name: this.name,
      },
    };
  }

  /** @internal */
  public getSSTAWSPermissions() {
    return [
      {
        actions: ["s3:*"],
        resources: [this.arn, interpolate`${this.arn}/*`],
      },
    ];
  }
}
