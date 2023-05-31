import { Construct } from "constructs";
import { Queue } from "./Queue.js";
import { Topic } from "./Topic.js";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct.js";
import {
  Function as Fn,
  FunctionProps,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function.js";
import { FunctionBindingProps } from "./util/functionBinding.js";
import { Permissions } from "./util/permission.js";
import { Duration, toCdkDuration } from "./util/duration.js";
import {
  BucketProps as CDKBucketProps,
  Bucket as CDKBucket,
  BlockPublicAccess,
  IBucket,
  EventType,
  CorsRule,
  HttpMethods,
  ObjectOwnership,
} from "aws-cdk-lib/aws-s3";
import {
  LambdaDestination,
  SnsDestination,
  SqsDestination,
} from "aws-cdk-lib/aws-s3-notifications";

/////////////////////
// Interfaces
/////////////////////

export interface BucketCorsRule {
  /**
   * The collection of allowed HTTP methods.
   */
  allowedMethods: (keyof typeof HttpMethods)[];
  /**
   * The collection of allowed origins.
   *
   * @example
   * ```js
   * // Allow all origins
   * allowOrigins: ["*"]
   *
   * // Allow specific origins. Note that the url protocol, ie. "https://", is required.
   * allowOrigins: ["https://domain.com"]
   * ```
   */
  allowedOrigins: string[];
  /**
   * The collection of allowed headers.
   */
  allowedHeaders?: string[];
  /**
   * The collection of exposed headers.
   */
  exposedHeaders?: string[];
  /**
   * A unique identifier for this rule.
   */
  id?: string;
  /**
   * Specify how long the results of a preflight response can be cached
   */
  maxAge?: Duration;
}

interface BucketBaseNotificationProps {
  /**
   * The S3 event types that will trigger the notification.
   */
  events?: Lowercase<keyof typeof EventType>[];
  /**
   * S3 object key filter rules to determine which objects trigger this event.
   */
  filters?: BucketFilter[];
}

export interface BucketFilter {
  /**
   * Filter what the key starts with
   */
  prefix?: string;
  /**
   * Filter what the key ends with
   */
  suffix?: string;
}

/**
 * Used to define a function listener for the bucket
 *
 * @example
 * ```js
 * new Bucket(stack, "Bucket", {
 *   notifications: {
 *     myNotification: {
 *       function: "src/notification.main"
 *     }
 *   }
 * }
 * ```
 */
export interface BucketFunctionNotificationProps
  extends BucketBaseNotificationProps {
  /**
   * String literal to signify that the notification is a function
   */
  type?: "function";
  /**
   * The function to send notifications to
   */
  function: FunctionDefinition;
}

/**
 * Used to define a queue listener for the bucket
 *
 * @example
 * ```js
 * new Bucket(stack, "Bucket", {
 *   notifications: {
 *     myNotification: {
 *       type: "queue",
 *       queue: new Queue(stack, "Queue")
 *     }
 *   }
 * }
 * ```
 */
export interface BucketQueueNotificationProps
  extends BucketBaseNotificationProps {
  /**
   * String literal to signify that the notification is a queue
   */
  type: "queue";
  /**
   * The queue to send notifications to
   */
  queue: Queue;
}

/**
 * Used to define a topic listener for the bucket
 *
 * @example
 * ```js
 * new Bucket(stack, "Bucket", {
 *   notifications: {
 *     myNotification: {
 *       type: "topic",
 *       topic: new Topic(stack, "Topic")
 *     }
 *   }],
 * }
 * ```
 */
export interface BucketTopicNotificationProps
  extends BucketBaseNotificationProps {
  type: "topic";
  /**
   * The topic to send notifications to
   */
  topic: Topic;
}

export interface BucketProps {
  /**
   * The name of the bucket.
   *
   * Note that it's not recommended to hard code a name for the bucket, because they must be globally unique.
   *
   * @example
   * ```js
   * new Bucket(stack, "Bucket", {
   *   name: "my-bucket",
   * });
   * ```
   */
  name?: string;
  /**
   * The CORS configuration of this bucket.
   * @default true
   * @example
   * ```js
   * new Bucket(stack, "Bucket", {
   *   cors: true,
   * });
   * ```
   *
   * ```js
   * new Bucket(stack, "Bucket", {
   *   cors: [
   *     {
   *       allowedMethods: ["GET"],
   *       allowedOrigins: ["https://www.example.com"],
   *     }
   *   ],
   * });
   * ```
   */
  cors?: boolean | BucketCorsRule[];
  /**
   * Prevent any files from being uploaded with public access configured. Setting this to `true` prevents uploading objects with public ACLs.
   * Note that setting to `false` does not necessarily mean that the bucket is completely accessible to the public. Rather, it enables the granting of public permissions on a per file basis.
   * @default false
   * @example
   * ```js
   * new Bucket(stack, "Bucket", {
   *   blockPublicACLs: true,
   * });
   * ```
   */
  blockPublicACLs?: boolean;
  /**
   * The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.
   *
   * @example
   * ```js
   * new Bucket(stack, "Bucket", {
   *   defaults: {
   *     function: {
   *       timeout: 20,
   *     }
   *   },
   * });
   * ```
   */
  defaults?: {
    function?: FunctionProps;
  };
  /**
   * Used to create notifications for various bucket events
   *
   * @example
   * ```js
   * new Bucket(stack, "Bucket", {
   *   notifications: {
   *     myNotification: "src/notification.main",
   *   }
   * });
   * ```
   */
  notifications?: Record<
    string,
    | FunctionInlineDefinition
    | BucketFunctionNotificationProps
    | Queue
    | BucketQueueNotificationProps
    | Topic
    | BucketTopicNotificationProps
  >;
  cdk?: {
    /**
     * Allows you to override default id for this construct.
     */
    id?: string;
    /**
     * Allows you to override default settings this construct uses internally to create the bucket.
     *
     * @example
     * ```js
     * new Bucket(stack, "Bucket", {
     *   cdk: {
     *     bucket: {
     *       bucketName: "my-bucket",
     *     },
     *   }
     * });
     * ```
     */
    bucket?: IBucket | CDKBucketProps;
  };
}

/////////////////////
// Construct
/////////////////////

/**
 * The `Bucket` construct is a higher level CDK construct that makes it easy to create an S3 Bucket and to define its notifications.
 *
 * @example
 *
 * ```js
 * import { Bucket } from "sst/constructs";
 *
 * new Bucket(stack, "Bucket");
 * ```
 */
export class Bucket extends Construct implements SSTConstruct {
  public readonly id: string;
  public readonly cdk: {
    /**
     * The internally created CDK `Bucket` instance.
     */
    bucket: IBucket;
  };
  readonly notifications: Record<string, Fn | Queue | Topic> = {};
  readonly bindingForAllNotifications: SSTConstruct[] = [];
  readonly permissionsAttachedForAllNotifications: Permissions[] = [];
  readonly props: BucketProps;

  constructor(scope: Construct, id: string, props?: BucketProps) {
    super(scope, props?.cdk?.id || id);

    this.id = id;
    this.props = props || {};
    this.cdk = {} as any;

    this.createBucket();
    this.addNotifications(this, props?.notifications || {});
  }

  /**
   * The ARN of the internally created `Bucket` instance.
   */
  public get bucketArn(): string {
    return this.cdk.bucket.bucketArn;
  }

  /**
   * The name of the internally created `Bucket` instance.
   */
  public get bucketName(): string {
    return this.cdk.bucket.bucketName;
  }

  /**
   * A list of the internally created functions for the notifications.
   */
  public get notificationFunctions(): Fn[] {
    return Object.values(this.notifications).filter(
      (notification) => notification instanceof Fn
    ) as Fn[];
  }

  /**
   * Add notification subscriptions after the bucket has been created
   *
   * @example
   * ```js {3}
   * const bucket = new Bucket(stack, "Bucket");
   * bucket.addNotifications(stack, {
   *   myNotification: "src/notification.main"
   * });
   * ```
   */
  public addNotifications(
    scope: Construct,
    notifications: Record<
      string,
      | FunctionInlineDefinition
      | BucketFunctionNotificationProps
      | Queue
      | BucketQueueNotificationProps
      | Topic
      | BucketTopicNotificationProps
    >
  ): void {
    Object.entries(notifications).forEach(
      ([notificationName, notification]) => {
        this.addNotification(scope, notificationName, notification);
      }
    );
  }

  /**
   * Binds the given list of resources to all bucket notifications
   * @example
   * ```js {20}
   * const bucket = new Bucket(stack, "Bucket", {
   *   notifications: {
   *     myNotification: "src/function.handler",
   *   }
   * });
   *
   * bucket.bind([STRIPE_KEY, bucket]);
   * ```
   */
  public bind(constructs: SSTConstruct[]) {
    this.notificationFunctions.forEach((notification) =>
      notification.bind(constructs)
    );
    this.bindingForAllNotifications.push(...constructs);
  }

  /**
   * Binds the given list of resources to a specific bucket notification
   *
   * @example
   * ```js {20}
   * const bucket = new Bucket(stack, "Bucket", {
   *   notifications: {
   *     myNotification: "src/function.handler",
   *   }
   * });
   *
   * bucket.bindToNotification("myNotification", ["s3"]);
   * ```
   */
  public bindToNotification(
    notificationName: string,
    constructs: SSTConstruct[]
  ): void {
    const notification = this.notifications[notificationName];
    if (!(notification instanceof Fn)) {
      throw new Error(
        `Cannot bind to the "${this.node.id}" Bucket notification because it's not a Lambda function`
      );
    }
    notification.bind(constructs);
  }

  /**
   * Attaches additional permissions to all bucket notifications
   * @example
   * ```js {20}
   * const bucket = new Bucket(stack, "Bucket", {
   *   notifications: {
   *     myNotification: "src/function.handler",
   *   }
   * });
   *
   * bucket.attachPermissions(["s3"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    this.notificationFunctions.forEach((notification) =>
      notification.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllNotifications.push(permissions);
  }

  /**
   * Attaches additional permissions to a specific bucket notification
   *
   * @example
   * ```js {20}
   * const bucket = new Bucket(stack, "Bucket", {
   *   notifications: {
   *     myNotification: "src/function.handler",
   *   }
   * });
   *
   * bucket.attachPermissionsToNotification("myNotification", ["s3"]);
   * ```
   */
  public attachPermissionsToNotification(
    notificationName: string,
    permissions: Permissions
  ): void {
    const notification = this.notifications[notificationName];
    if (!(notification instanceof Fn)) {
      throw new Error(
        `Cannot attach permissions to the "${this.node.id}" Bucket notification because it's not a Lambda function`
      );
    }
    notification.attachPermissions(permissions);
  }

  public getConstructMetadata() {
    return {
      type: "Bucket" as const,
      data: {
        name: this.cdk.bucket.bucketName,
        notifications: Object.values(this.notifications).map(getFunctionRef),
        notificationNames: Object.keys(this.notifications),
      },
    };
  }

  /** @internal */
  public getFunctionBinding(): FunctionBindingProps {
    return {
      clientPackage: "bucket",
      variables: {
        bucketName: {
          type: "plain",
          value: this.bucketName,
        },
      },
      permissions: {
        "s3:*": [this.bucketArn, `${this.bucketArn}/*`],
      },
    };
  }

  private createBucket() {
    const { name, cors, blockPublicACLs, cdk } = this.props;

    if (isCDKConstruct(cdk?.bucket)) {
      if (cors !== undefined) {
        throw new Error(
          `Cannot configure the "cors" when "cdk.bucket" is a construct`
        );
      }
      this.cdk.bucket = cdk?.bucket as CDKBucket;
    } else {
      this.cdk.bucket = new CDKBucket(this, "Bucket", {
        bucketName: name,
        cors: this.buildCorsConfig(cors),
        blockPublicAccess: this.buildBlockPublicAccessConfig(blockPublicACLs),
        objectOwnership: this.buildObjectOwnershipConfig(blockPublicACLs),
        ...cdk?.bucket,
      });
    }
  }

  private addNotification(
    scope: Construct,
    notificationName: string,
    notification:
      | FunctionInlineDefinition
      | BucketFunctionNotificationProps
      | Queue
      | BucketQueueNotificationProps
      | Topic
      | BucketTopicNotificationProps
  ): void {
    if (
      notification instanceof Queue ||
      (notification as BucketQueueNotificationProps).queue
    ) {
      notification = notification as Queue | BucketQueueNotificationProps;
      this.addQueueNotification(scope, notificationName, notification);
    } else if (
      notification instanceof Topic ||
      (notification as BucketTopicNotificationProps).topic
    ) {
      notification = notification as Topic | BucketTopicNotificationProps;
      this.addTopicNotification(scope, notificationName, notification);
    } else {
      notification = notification as
        | FunctionInlineDefinition
        | BucketFunctionNotificationProps;
      this.addFunctionNotification(scope, notificationName, notification);
    }
  }

  private addQueueNotification(
    _scope: Construct,
    notificationName: string,
    notification: Queue | BucketQueueNotificationProps
  ): void {
    // Parse notification props
    let notificationProps;
    let queue: Queue;
    if (notification instanceof Queue) {
      notification = notification as Queue;
      queue = notification;
    } else {
      notification = notification as BucketQueueNotificationProps;
      notificationProps = {
        events: notification.events,
        filters: notification.filters,
      };
      queue = notification.queue;
    }
    this.notifications[notificationName] = queue;

    // Create Notifications
    const events = notificationProps?.events || [
      "object_created",
      "object_removed",
    ];
    const filters = notificationProps?.filters || [];
    events.forEach((event) =>
      this.cdk.bucket.addEventNotification(
        EventType[event.toUpperCase() as keyof typeof EventType],
        new SqsDestination(queue.cdk.queue),
        ...filters
      )
    );
  }

  private addTopicNotification(
    _scope: Construct,
    notificationName: string,
    notification: Topic | BucketTopicNotificationProps
  ): void {
    // Parse notification props
    let notificationProps;
    let topic: Topic;
    if (notification instanceof Topic) {
      notification = notification as Topic;
      topic = notification;
    } else {
      notification = notification as BucketTopicNotificationProps;
      notificationProps = {
        events: notification.events,
        filters: notification.filters,
      };
      topic = notification.topic;
    }
    this.notifications[notificationName] = topic;

    // Create Notifications
    const events = notificationProps?.events || [
      "object_created",
      "object_removed",
    ];
    const filters = notificationProps?.filters || [];
    events.forEach((event) =>
      this.cdk.bucket.addEventNotification(
        EventType[event.toUpperCase() as keyof typeof EventType],
        new SnsDestination(topic.cdk.topic),
        ...filters
      )
    );
  }

  private addFunctionNotification(
    scope: Construct,
    notificationName: string,
    notification: FunctionInlineDefinition | BucketFunctionNotificationProps
  ): void {
    // parse notification
    let notificationFunction, notificationProps;
    if ((notification as BucketFunctionNotificationProps).function) {
      notification = notification as BucketFunctionNotificationProps;
      notificationFunction = notification.function;
      notificationProps = {
        events: notification.events,
        filters: notification.filters,
      };
    } else {
      notificationFunction = notification as FunctionInlineDefinition;
    }

    // create function
    const fn = Fn.fromDefinition(
      scope,
      `Notification_${this.node.id}_${notificationName}`,
      notificationFunction,
      this.props.defaults?.function,
      `The "defaults.function" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the consumers using FunctionProps, so the Table construct can apply the "defaults.function" to them.`
    );
    this.notifications[notificationName] = fn;

    // create Notifications
    const events = notificationProps?.events || [
      "object_created",
      "object_removed",
    ];
    const filters = notificationProps?.filters || [];
    events.forEach((event) =>
      this.cdk.bucket.addEventNotification(
        EventType[event.toUpperCase() as keyof typeof EventType],
        new LambdaDestination(fn),
        ...filters
      )
    );

    // attached permissions
    this.permissionsAttachedForAllNotifications.forEach((permissions) =>
      fn.attachPermissions(permissions)
    );
    fn.bind(this.bindingForAllNotifications);
  }

  private buildCorsConfig(
    cors?: boolean | BucketCorsRule[]
  ): CorsRule[] | undefined {
    if (cors === false) {
      return;
    }
    if (cors === undefined || cors === true) {
      return [
        {
          allowedHeaders: ["*"],
          allowedMethods: [
            HttpMethods.GET,
            HttpMethods.PUT,
            HttpMethods.HEAD,
            HttpMethods.POST,
            HttpMethods.DELETE,
          ],
          allowedOrigins: ["*"],
        },
      ];
    }

    return cors.map((e) => ({
      allowedMethods: (e.allowedMethods || []).map(
        (method) => HttpMethods[method as keyof typeof HttpMethods]
      ),
      allowedOrigins: e.allowedOrigins,
      allowedHeaders: e.allowedHeaders,
      exposedHeaders: e.exposedHeaders,
      id: e.id,
      maxAge: e.maxAge && toCdkDuration(e.maxAge).toSeconds(),
    }));
  }

  private buildBlockPublicAccessConfig(config?: boolean) {
    return config === true
      ? BlockPublicAccess.BLOCK_ALL
      : new BlockPublicAccess({
          blockPublicAcls: false,
          ignorePublicAcls: false,
        });
  }

  private buildObjectOwnershipConfig(config?: boolean) {
    return config === true
      ? ObjectOwnership.BUCKET_OWNER_ENFORCED
      : ObjectOwnership.BUCKET_OWNER_PREFERRED;
  }
}
