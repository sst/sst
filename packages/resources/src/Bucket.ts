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
  defaults?: {
    function?: FunctionProps;
  };
  notifications?: (
    | FunctionInlineDefinition
    | BucketFunctionNotificationProps
    | Queue
    | BucketQueueNotificationProps
    | Topic
    | BucketTopicNotificationProps
  )[];
  cdk?: {
    bucket?: s3.Bucket | s3.BucketProps;
  };
}

export interface BucketBaseNotificationProps {
  events?: Lowercase<keyof typeof s3.EventType>[];
  filters?: {
    prefix?: string;
    suffix?: string;
  }[];
}

export interface BucketFunctionNotificationProps
  extends BucketBaseNotificationProps {
  function: FunctionDefinition;
}

export interface BucketQueueNotificationProps
  extends BucketBaseNotificationProps {
  queue: Queue;
}

export interface BucketTopicNotificationProps
  extends BucketBaseNotificationProps {
  topic: Topic;
}

/////////////////////
// Construct
/////////////////////

export class Bucket extends Construct implements SSTConstruct {
  public readonly cdk: {
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

  public get bucketArn(): string {
    return this.cdk.bucket.bucketArn;
  }

  public get bucketName(): string {
    return this.cdk.bucket.bucketName;
  }

  public get notificationFunctions(): Fn[] {
    return this.notifications.filter(
      (notification) => notification instanceof Fn
    ) as Fn[];
  }

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

  public attachPermissions(permissions: Permissions): void {
    this.notifications
      .filter((notification) => notification instanceof Fn)
      .forEach((notification) => notification.attachPermissions(permissions));
    this.permissionsAttachedForAllNotifications.push(permissions);
  }

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
