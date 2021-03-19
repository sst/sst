import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as lambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import { Function as Fn, FunctionDefinition } from "./Function";
import { Permissions } from "./util/permission";

/////////////////////
// Interfaces
/////////////////////

export interface BucketProps {
  readonly s3Bucket?: s3.Bucket | s3.BucketProps;
  readonly notifications?: (FunctionDefinition | BucketNotificationProps)[];
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

  constructor(scope: cdk.Construct, id: string, props?: BucketProps) {
    super(scope, id);

    const {
      // Bucket props
      s3Bucket,
      // Function props
      notifications,
    } = props || {};
    this.notificationFunctions = [];
    this.permissionsAttachedForAllNotifications = [];

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

  addNotification(
    scope: cdk.Construct,
    notification: FunctionDefinition | BucketNotificationProps
  ): Fn {
    let fn: Fn;
    const i = this.notificationFunctions.length;
    const defaultNotificationProps = {
      events: [s3.EventType.OBJECT_CREATED, s3.EventType.OBJECT_REMOVED],
    };

    // notification is props
    if ((notification as BucketNotificationProps).function) {
      notification = notification as BucketNotificationProps;
      const notificationProps =
        notification.notificationProps || defaultNotificationProps;

      fn = Fn.fromDefinition(scope, `Notification_${i}`, notification.function);
      fn.addEventSource(
        new lambdaEventSources.S3EventSource(this.s3Bucket, notificationProps)
      );
      this.notificationFunctions.push(fn);
    }
    // notification is function
    else {
      notification = notification as FunctionDefinition;

      fn = Fn.fromDefinition(scope, `Notification_${i}`, notification);
      fn.addEventSource(
        new lambdaEventSources.S3EventSource(
          this.s3Bucket,
          defaultNotificationProps
        )
      );
      this.notificationFunctions.push(fn);
    }

    // attached existing permissions
    this.permissionsAttachedForAllNotifications.forEach((permissions) =>
      fn.attachPermissions(permissions)
    );

    return fn;
  }

  addNotifications(
    scope: cdk.Construct,
    notifications: (FunctionDefinition | BucketNotificationProps)[]
  ): void {
    notifications.forEach((notification) =>
      this.addNotification(scope, notification)
    );
  }

  attachPermissions(permissions: Permissions): void {
    this.notificationFunctions.forEach((notification) =>
      notification.attachPermissions(permissions)
    );
    this.permissionsAttachedForAllNotifications.push(permissions);
  }

  attachPermissionsToNotification(
    index: number,
    permissions: Permissions
  ): void {
    this.notificationFunctions[index].attachPermissions(permissions);
  }
}
