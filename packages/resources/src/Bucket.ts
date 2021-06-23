import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as lambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import { Function as Fn, FunctionProps, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

/////////////////////
// Interfaces
/////////////////////

export interface BucketProps {
  readonly s3Bucket?: s3.Bucket | s3.BucketProps;
  readonly notifications?: (FunctionDefinition | BucketNotificationProps)[];
  readonly defaultFunctionProps?: FunctionProps;
}

export interface BucketNotificationProps {
  readonly function: FunctionDefinition;
  readonly notificationProps?: lambdaEventSources.S3EventSourceProps;
}

/////////////////////
// Construct
/////////////////////

export class Bucket extends cdk.Construct {
  public readonly s3Bucket: s3.Bucket;
  public readonly notificationFunctions: Fn[];
  private readonly permissionsAttachedForAllNotifications: Permissions[];
  private readonly defaultFunctionProps?: FunctionProps;

  constructor(scope: cdk.Construct, id: string, props?: BucketProps) {
    super(scope, id);

    const { s3Bucket, notifications, defaultFunctionProps } = props || {};
    this.notificationFunctions = [];
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
  }

  public get bucketArn(): string {
    return this.s3Bucket.bucketArn;
  }

  public get bucketName(): string {
    return this.s3Bucket.bucketName;
  }

  public addNotifications(
    scope: cdk.Construct,
    notifications: (FunctionDefinition | BucketNotificationProps)[]
  ): void {
    notifications.forEach((notification) =>
      this.addNotification(scope, notification)
    );
  }

  public attachPermissions(permissions: Permissions): void {
    this.notificationFunctions.forEach((notification) =>
      notification.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllNotifications.push(permissions);
  }

  public attachPermissionsToNotification(
    index: number,
    permissions: Permissions
  ): void {
    this.notificationFunctions[index].attachPermissions(permissions);
  }

  private addNotification(
    scope: cdk.Construct,
    notification: FunctionDefinition | BucketNotificationProps
  ): Fn {
    // parse notification
    let notificationFunction, notificationProps;
    if ((notification as BucketNotificationProps).function) {
      notification = notification as BucketNotificationProps;
      notificationFunction = notification.function;
      notificationProps = notification.notificationProps;
    } else {
      notificationFunction = notification as FunctionDefinition;
    }
    notificationProps = {
      events: [s3.EventType.OBJECT_CREATED, s3.EventType.OBJECT_REMOVED],
      ...(notificationProps || {}),
    };

    // create function
    const i = this.notificationFunctions.length;
    const fn = Fn.fromDefinition(
      scope,
      `Notification_${i}`,
      notificationFunction,
      this.defaultFunctionProps,
      `The "defaultFunctionProps" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the consumers using FunctionProps, so the Table construct can apply the "defaultFunctionProps" to them.`
    );
    this.notificationFunctions.push(fn);

    // create event source
    const eventSource = new lambdaEventSources.S3EventSource(
      this.s3Bucket,
      notificationProps
    );
    fn.addEventSource(eventSource);

    // attached permissions
    this.permissionsAttachedForAllNotifications.forEach((permissions) =>
      fn.attachPermissions(permissions)
    );

    return fn;
  }
}
