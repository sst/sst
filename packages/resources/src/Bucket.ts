import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Notifications from "aws-cdk-lib/aws-s3-notifications";
import { Queue } from "./Queue";
import { Topic } from "./Topic";
import { getFunctionRef, SSTConstruct, isCDKConstruct } from "./Construct";
import {
  Function as Fn,
  FunctionProps,
  FunctionInlineDefinition,
  FunctionDefinition,
} from "./Function";
import { Permissions } from "./util/permission";

/////////////////////
// Interfaces
/////////////////////

export interface BucketProps {
  /**
   * The default function props to be applied to all the Lambda functions in the Bucket. If the `function` is specified for a notification, these default values are overridden. Except for the `environment`, the `layers`, and the `permissions` properties, that will be merged.
   * @example
   * ### Specifying function props for all the notifications
   *
   * You can extend the minimal config, to set some function props and have them apply to all the notifications.
   *
   * ```js {3-7}
   * new Bucket(this, "Bucket", {
   *   defaults: {
   *     function: {
   *       timeout: 20,
   *       environment: { tableName: table.tableName },
   *       permissions: [table],
   *     },
   *   }
   *   notifications: [
   *     {
   *       function: "src/notification1.main",
   *       notificationProps: {
   *         events: [EventType.OBJECT_CREATED],
   *       },
   *     },
   *     {
   *       function: "src/notification2.main",
   *       notificationProps: {
   *         events: [EventType.OBJECT_REMOVED],
   *       },
   *     },
   *   ],
   * });
   * ```
   */
  defaults?: {
    function?: FunctionProps;
  };
  /**
   * Used to create notifications for various bucket events
   * @example
   * ### Enabling S3 Event Notifications
   *
   * #### Using the minimal config
   *
   * ```js
   * import { Bucket } from "@serverless-stack/resources";
   *
   * new Bucket(this, "Bucket", {
   *   notifications: ["src/notification.main"],
   * });
   * ```
   *
   * Or configuring the notification events.
   *
   * ```js {5-10}
   * import { EventType } from "aws-cdk-lib/aws-s3";
   *
   * const bucket = new Bucket(this, "Bucket", {
   *   notifications: [
   *     {
   *       function: "src/notification.main",
   *       notificationProps: {
   *         events: [EventType.OBJECT_CREATED],
   *       },
   *     },
   *   ],
   * });
   * ```
   *
   * ### Configuring Queue notifications
   *
   * #### Specifying the Queue directly
   *
   * You can directly pass in an instance of the [Queue](Queue.md) construct.
   *
   * ```js {6}
   * import { Queue } from "@serverless-stack/resources";
   *
   * const myQueue = new Queue(this, "MyQueue");
   *
   * new Bucket(this, "Bucket", {
   *   notifications: [myQueue],
   * });
   * ```
   *
   * #### Configuring the notification
   *
   * ```js {5-11}
   * const myQueue = new Queue(this, "MyQueue");
   *
   * new Bucket(this, "Bucket", {
   *   notifications: [
   *     {
   *       queue: myQueue,
   *       notificationProps: {
   *         events: [EventType.OBJECT_CREATED_PUT],
   *         filters: [{ prefix: "imports/" }, { suffix: ".jpg" }],
   *       }
   *     }
   *   ],
   * });
   * ```
   *
   * ### Configuring Topic notifications
   *
   * #### Specifying the Topic directly
   *
   * You can directly pass in an instance of the [Topic](Topic.md) construct.
   *
   * ```js {6}
   * import { Topic } from "@serverless-stack/resources";
   *
   * const myTopic = new Topic(this, "MyTopic");
   *
   * new Bucket(this, "Bucket", {
   *   notifications: [myTopic],
   * });
   * ```
   *
   * #### Configuring the notification
   *
   * ```js {5-11}
   * const myTopic = new Topic(this, "MyTopic");
   *
   * new Bucket(this, "Bucket", {
   *   notifications: [
   *     {
   *       topic: myTopic,
   *       notificationProps: {
   *         events: [EventType.OBJECT_CREATED_PUT],
   *         filters: [{ prefix: "imports/" }, { suffix: ".jpg" }],
   *       }
   *     }
   *   ],
   * });
   * ```
   */
  notifications?: (
    | FunctionInlineDefinition
    | BucketFunctionNotificationProps
    | Queue
    | BucketQueueNotificationProps
    | Topic
    | BucketTopicNotificationProps
  )[];
  cdk?: {
    /**
     * Allows you to override default settings this construct uses internally to ceate the bucket
     * @example
     * ### Configuring the S3 Bucket
     *
     * Configure the internally created CDK `Bucket` instance.
     *
     * ```js {2-4}
     * new Bucket(this, "Bucket", {
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

export interface BucketBaseNotificationProps {
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

export interface BucketFunctionNotificationProps
  extends BucketBaseNotificationProps {
  /**
   * The function to send notifications to
   */
  function: FunctionDefinition;
}

export interface BucketQueueNotificationProps
  extends BucketBaseNotificationProps {
  /**
   * The queue to send notifications to
   */
  queue: Queue;
}

export interface BucketTopicNotificationProps
  extends BucketBaseNotificationProps {
  /**
   * The topic to send notifications to
   */
  topic: Topic;
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
 * new Bucket(this, "Bucket");
 * ```
 *
 * ### Removing the S3 Bucket
 *
 * Only empty S3 buckets can be deleted. However, you can configure the bucket to automatically delete all objects upon removal.
 *
 * ```js {5-6}
 * import * as cdk from "aws-cdk-lib";
 *
 * new Bucket(this, "Bucket", {
 *   s3Bucket: {
 *     autoDeleteObjects: true,
 *     removalPolicy: cdk.RemovalPolicy.DESTROY,
 *   },
 * });
 * ```
 */
export class Bucket extends Construct implements SSTConstruct {
  public readonly cdk: {
    /**
     * The internally created CDK `Bucket` instance.
     */
    bucket: s3.Bucket;
  };
  readonly notifications: (Fn | Queue | Topic)[];
  readonly permissionsAttachedForAllNotifications: Permissions[];
  readonly props: BucketProps;

  constructor(scope: Construct, id: string, props?: BucketProps) {
    super(scope, id);

    this.props = props || {};
    this.cdk = {} as any;
    this.notifications = [];
    this.permissionsAttachedForAllNotifications = [];

    this.createBucket();
    this.addNotifications(this, props?.notifications || []);
  }

  /**
   * The ARN of the internally created CDK `Bucket` instance.
   */
  public get bucketArn(): string {
    return this.cdk.bucket.bucketArn;
  }

  /**
   * The name of the internally created CDK `Bucket` instance.
   */
  public get bucketName(): string {
    return this.cdk.bucket.bucketName;
  }

  /**
   * A list of the internally created functions for the notifications.
   */
  public get notificationFunctions(): Fn[] {
    return this.notifications.filter(
      (notification) => notification instanceof Fn
    ) as Fn[];
  }

  /**
   * Add notification subscriptions after the bucket has been created
   *
   * @example
   * ### Lazily adding notifications
   *
   * Create an _empty_ bucket and lazily add the notifications.
   *
   * ```js {3}
   * const bucket = new Bucket(this, "Bucket");
   *
   * bucket.addNotifications(this, ["src/notification.main"]);
   * ```
   */
  public addNotifications(
    scope: Construct,
    notifications: (
      | FunctionInlineDefinition
      | BucketFunctionNotificationProps
      | Queue
      | BucketQueueNotificationProps
      | Topic
      | BucketTopicNotificationProps
    )[]
  ): void {
    notifications.forEach((notification) =>
      this.addNotification(scope, notification)
    );
  }

  /**
   * Attaches additional permissions to all bucket notifications
   *
   * @example
   * ### Giving the notifications some permissions
   *
   * Allow the notification functions to access S3.
   *
   * ```js {20}
   * import { EventType } from "aws-cdk-lib/aws-s3";
   *
   * const bucket = new Bucket(this, "Bucket", {
   *   notifications: [
   *     {
   *       function: "src/notification1.main",
   *       notificationProps: {
   *         events: [EventType.OBJECT_CREATED],
   *       },
   *     },
   *     {
   *       function: "src/notification2.main",
   *       notificationProps: {
   *         events: [EventType.OBJECT_REMOVED],
   *       },
   *     },
   *   ],
   * });
   *
   * bucket.attachPermissions(["s3"]);
   * ```
   */
  public attachPermissions(permissions: Permissions): void {
    this.notifications
      .filter((notification) => notification instanceof Fn)
      .forEach((notification) => notification.attachPermissions(permissions));
    this.permissionsAttachedForAllNotifications.push(permissions);
  }

  /**
   * Attaches additional permissions to a specific bucket notification
   *
   * @example
   * ### Giving a specific notification some permissions
   *
   * Allow the first notification function to access S3.
   *
   * ```js {20}
   * import { EventType } from "aws-cdk-lib/aws-s3";
   *
   * const bucket = new Bucket(this, "Bucket", {
   *   notifications: [
   *     {
   *       function: "src/notification1.main",
   *       notificationProps: {
   *         events: [EventType.OBJECT_CREATED],
   *       },
   *     },
   *     {
   *       function: "src/notification2.main",
   *       notificationProps: {
   *         events: [EventType.OBJECT_REMOVED],
   *       },
   *     },
   *   ],
   * });
   *
   * bucket.attachPermissionsToNotification(0, ["s3"]);
   * ```
   */
  public attachPermissionsToNotification(
    index: number,
    permissions: Permissions
  ): void {
    const notification = this.notifications[index];
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
        notifications: this.notifications.map((n) => getFunctionRef(n)),
      },
    };
  }

  private createBucket() {
    const { cdk } = this.props;

    if (isCDKConstruct(cdk?.bucket)) {
      this.cdk.bucket = cdk?.bucket as s3.Bucket;
    } else {
      this.cdk.bucket = new s3.Bucket(this, "Bucket", {
        ...cdk?.bucket,
      });
    }
  }

  private addNotification(
    scope: Construct,
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
      this.addQueueNotification(scope, notification);
    } else if (
      notification instanceof Topic ||
      (notification as BucketTopicNotificationProps).topic
    ) {
      notification = notification as Topic | BucketTopicNotificationProps;
      this.addTopicNotification(scope, notification);
    } else {
      notification = notification as
        | FunctionInlineDefinition
        | BucketFunctionNotificationProps;
      this.addFunctionNotification(scope, notification);
    }
  }

  private addQueueNotification(
    scope: Construct,
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
    this.notifications.push(queue);

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
    this.notifications.push(topic);

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
    const i = this.notifications.length;
    const fn = Fn.fromDefinition(
      scope,
      `Notification_${this.node.id}_${i}`,
      notificationFunction,
      this.props.defaults?.function,
      `The "defaults.function" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the consumers using FunctionProps, so the Table construct can apply the "defaults.function" to them.`
    );
    this.notifications.push(fn);

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
}
