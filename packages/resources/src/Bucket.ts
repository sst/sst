import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as s3Notifications from "@aws-cdk/aws-s3-notifications";
import { App } from "./App";
import { Stack } from "./Stack";
import { Queue } from "./Queue";
import { Topic } from "./Topic";
import { ISstConstruct, ISstConstructInfo } from "./Construct";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

/////////////////////
// Interfaces
/////////////////////

export interface BucketProps {
  readonly s3Bucket?: s3.Bucket | s3.BucketProps;
  readonly notifications?: (
    | FunctionDefinition
    | BucketFunctionNotificationProps
    | Queue
    | BucketQueueNotificationProps
    | Topic
    | BucketTopicNotificationProps
  )[];
  readonly defaultFunctionProps?: FunctionProps;
}

export interface BucketNotificationProps {
  readonly events?: s3.EventType[];
  readonly filters?: s3.NotificationKeyFilter[];
}

export interface BucketFunctionNotificationProps {
  readonly function: FunctionDefinition;
  readonly notificationProps?: BucketNotificationProps;
}

export interface BucketQueueNotificationProps {
  readonly queue: Queue;
  readonly notificationProps?: BucketNotificationProps;
}

export interface BucketTopicNotificationProps {
  readonly topic: Topic;
  readonly notificationProps?: BucketNotificationProps;
}

/////////////////////
// Construct
/////////////////////

export class Bucket extends cdk.Construct implements ISstConstruct {
  public readonly s3Bucket: s3.Bucket;
  private readonly notifications: (Fn | Queue | Topic)[];
  private readonly permissionsAttachedForAllNotifications: Permissions[];
  private readonly defaultFunctionProps?: FunctionProps;

  constructor(scope: cdk.Construct, id: string, props?: BucketProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const { s3Bucket, notifications, defaultFunctionProps } = props || {};
    this.notifications = [];
    this.permissionsAttachedForAllNotifications = [];
    this.defaultFunctionProps = defaultFunctionProps;

    ////////////////////
    // Create Bucket
    ////////////////////

    if (cdk.Construct.isConstruct(s3Bucket)) {
      this.s3Bucket = s3Bucket as s3.Bucket;
    } else {
      const s3BucketProps = (s3Bucket || {}) as s3.BucketProps;
      this.s3Bucket = new s3.Bucket(this, "Bucket", {
        ...s3BucketProps,
      });
    }

    ///////////////////////////
    // Create Notifications
    ///////////////////////////

    this.addNotifications(this, notifications || []);

    ///////////////////
    // Register Construct
    ///////////////////
    root.registerConstruct(this);
  }

  public get bucketArn(): string {
    return this.s3Bucket.bucketArn;
  }

  public get bucketName(): string {
    return this.s3Bucket.bucketName;
  }

  public get notificationFunctions(): Fn[] {
    return this.notifications.filter(
      (notification) => notification instanceof Fn
    ) as Fn[];
  }

  public addNotifications(
    scope: cdk.Construct,
    notifications: (
      | FunctionDefinition
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

  public getConstructInfo(): ISstConstructInfo {
    // imported
    if (!cdk.Token.isUnresolved(this.s3Bucket.bucketName)) {
      return {
        bucketName: this.s3Bucket.bucketName,
      };
    }
    // created
    const cfn = this.s3Bucket.node.defaultChild as s3.CfnBucket;
    return {
      bucketLogicalId: Stack.of(this).getLogicalId(cfn),
    };
  }

  private addNotification(
    scope: cdk.Construct,
    notification:
      | FunctionDefinition
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
        | FunctionDefinition
        | BucketFunctionNotificationProps;
      this.addFunctionNotification(scope, notification);
    }
  }

  private addQueueNotification(
    scope: cdk.Construct,
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
      notificationProps = notification.notificationProps;
      queue = notification.queue;
    }
    this.notifications.push(queue);

    // Create Notifications
    const events = notificationProps?.events || [
      s3.EventType.OBJECT_CREATED,
      s3.EventType.OBJECT_REMOVED,
    ];
    const filters = notificationProps?.filters || [];
    events.forEach((event) =>
      this.s3Bucket.addEventNotification(
        event,
        new s3Notifications.SqsDestination(queue.sqsQueue),
        ...filters
      )
    );
  }

  private addTopicNotification(
    scope: cdk.Construct,
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
      notificationProps = notification.notificationProps;
      topic = notification.topic;
    }
    this.notifications.push(topic);

    // Create Notifications
    const events = notificationProps?.events || [
      s3.EventType.OBJECT_CREATED,
      s3.EventType.OBJECT_REMOVED,
    ];
    const filters = notificationProps?.filters || [];
    events.forEach((event) =>
      this.s3Bucket.addEventNotification(
        event,
        new s3Notifications.SnsDestination(topic.snsTopic),
        ...filters
      )
    );
  }

  private addFunctionNotification(
    scope: cdk.Construct,
    notification: FunctionDefinition | BucketFunctionNotificationProps
  ): void {
    // parse notification
    let notificationFunction, notificationProps;
    if ((notification as BucketFunctionNotificationProps).function) {
      notification = notification as BucketFunctionNotificationProps;
      notificationFunction = notification.function;
      notificationProps = notification.notificationProps;
    } else {
      notificationFunction = notification as FunctionDefinition;
    }

    // create function
    const i = this.notifications.length;
    const fn = Fn.fromDefinition(
      scope,
      `Notification_${i}`,
      notificationFunction,
      this.defaultFunctionProps,
      `The "defaultFunctionProps" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the consumers using FunctionProps, so the Table construct can apply the "defaultFunctionProps" to them.`
    );
    this.notifications.push(fn);

    // create Notifications
    const events = notificationProps?.events || [
      s3.EventType.OBJECT_CREATED,
      s3.EventType.OBJECT_REMOVED,
    ];
    const filters = notificationProps?.filters || [];
    events.forEach((event) =>
      this.s3Bucket.addEventNotification(
        event,
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
