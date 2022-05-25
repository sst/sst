import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Notifications from "aws-cdk-lib/aws-s3-notifications";
import { Queue } from "./Queue.js";
import { Topic } from "./Topic.js";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct.js";
import {
  Function as Fn,
  FunctionProps,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function.js";
import { Permissions } from "./util/permission.js";
import { Duration, toCdkDuration } from "./util/duration.js";

/////////////////////
// Interfaces
/////////////////////

export interface BucketCorsRule {
  /**
   * The collection of allowed HTTP methods.
   */
  allowedMethods: (keyof typeof s3.HttpMethods)[];
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
  events?: Lowercase<keyof typeof s3.EventType>[];
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
   *
   * @example
   *
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
     * Allows you to override default settings this construct uses internally to ceate the bucket
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
    bucket?: s3.Bucket | s3.BucketProps;
  };
}

/////////////////////
// Construct
/////////////////////

/**
 * The `Bucket` construct is a higher level CDK construct that makes it easy to create an S3 Bucket and to define its notifications. It also internally connects the notifications and bucket together.
 *
 * @example
 * ### Using the minimal config
 *
 * ```js
 * import { Bucket } from "@serverless-stack/resources";
 *
 * new Bucket(stack, "Bucket");
 * ```
 */
export class Bucket extends Construct implements SSTConstruct {
  public readonly cdk: {
    /**
     * The internally created CDK `Bucket` instance.
     */
    bucket: s3.Bucket;
  };
  readonly notifications: Record<string, Fn | Queue | Topic>;
  readonly permissionsAttachedForAllNotifications: Permissions[];
  readonly props: BucketProps;

  constructor(scope: Construct, id: string, props?: BucketProps) {
    super(scope, id);

    this.props = props || {};
    this.cdk = {} as any;
    this.notifications = {};
    this.permissionsAttachedForAllNotifications = [];

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
   * bucket.addNotifications(stack, ["src/notification.main"]);
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
   * bucket.attachPermissions("myNotification", ["s3"]);
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

  private createBucket() {
    const { name, cors, cdk } = this.props;

    if (isCDKConstruct(cdk?.bucket)) {
      if (cors !== undefined) {
        throw new Error(
          `Cannot configure the "cors" when "cdk.bucket" is a construct`
        );
      }
      this.cdk.bucket = cdk?.bucket as s3.Bucket;
    } else {
      this.cdk.bucket = new s3.Bucket(this, "Bucket", {
        bucketName: name,
        cors: this.buildCorsConfig(cors),
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
    scope: Construct,
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
        s3.EventType[event.toUpperCase() as keyof typeof s3.EventType],
        new s3Notifications.SqsDestination(queue.cdk.queue),
        ...filters
      )
    );
  }

  private addTopicNotification(
    scope: Construct,
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
        s3.EventType[event.toUpperCase() as keyof typeof s3.EventType],
        new s3Notifications.SnsDestination(topic.cdk.topic),
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
        s3.EventType[event.toUpperCase() as keyof typeof s3.EventType],
        new s3Notifications.LambdaDestination(fn),
        ...filters
      )
    );

    // attached permissions
    this.permissionsAttachedForAllNotifications.forEach((permissions) =>
      fn.attachPermissions(permissions)
    );
  }

  private buildCorsConfig(
    cors?: boolean | BucketCorsRule[]
  ): s3.CorsRule[] | undefined {
    if (cors === undefined || cors === false) {
      return;
    }
    if (cors === true) {
      return [
        {
          allowedHeaders: ["*"],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.HEAD,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ["*"],
        },
      ];
    }

    return cors.map((e) => ({
      allowedMethods: (e.allowedMethods || []).map(
        (method) => s3.HttpMethods[method as keyof typeof s3.HttpMethods]
      ),
      allowedOrigins: e.allowedOrigins,
      allowedHeaders: e.allowedHeaders,
      exposedHeaders: e.exposedHeaders,
      id: e.id,
      maxAge: e.maxAge && toCdkDuration(e.maxAge).toSeconds(),
    }));
  }
}
