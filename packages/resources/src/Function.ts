import path from "path";
import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";

import { App } from "./App";
import { Table } from "./Table";
import { Queue } from "./Queue";
import { Topic } from "./Topic";
import { builder } from "./util/builder";

export type HandlerProps = FunctionHandlerProps;

export interface FunctionProps extends lambda.FunctionOptions {
  /**
   * Path to the entry point and handler function. Of the format:
   * `/path/to/file.function`.
   */
  readonly handler?: string;
  /**
   * The source directory where the entry point is located. The node_modules in this
   * directory is used to generate the bundle.
   *
   * @default - Defaults to the app directory.
   */
  readonly srcPath?: string;
  /**
   * The runtime environment. Only runtimes of the Node.js family are
   * supported.
   *
   * @default - Defaults to NODEJS_12_X
   */
  readonly runtime?: lambda.Runtime;
  /**
   * The amount of memory in MB allocated.
   *
   * @default - Defaults to 1024
   */
  readonly memorySize?: number;
  /**
   * The execution timeout in seconds.
   *
   * @default - Defaults to Duration.seconds(20)
   */
  readonly timeout?: cdk.Duration;
  /**
   * Enable AWS X-Ray Tracing.
   *
   * @default - Defaults to ACTIVE
   */
  readonly tracing?: lambda.Tracing;
  /**
   * Disable bundling with esbuild.
   *
   * @default - Defaults to true
   */
  readonly bundle?: boolean;
}

/**
 * Doe props for Lambda function.
 */
export interface FunctionHandlerProps {
  /**
   * Source path
   */
  readonly srcPath: string;

  /**
   * Source handler
   */
  readonly handler: string;
}

/**
 * Doe props for Lambda function.
 */
export type FunctionPermissions = string | [ string ] | [ cdk.Construct ] | [ {(grantee: iam.IGrantable): iam.Grant;} ];

export class Function extends lambda.Function {
  constructor(scope: cdk.Construct, id: string, props: FunctionProps) {
    const root = scope.node.root as App;

    // Set defaults
    const handler = props.handler;
    const runtime = props.runtime || lambda.Runtime.NODEJS_12_X;
    const timeout = props.timeout || cdk.Duration.seconds(20);
    const memorySize = props.memorySize || 1024;
    const tracing = props.tracing || lambda.Tracing.ACTIVE;
    const bundle = props.bundle === undefined ? true : props.bundle;
    const srcPath = props.srcPath || ".";

    // Validate handler
    if (!handler) {
      throw new Error(`No handler defined for the "${id}" Lambda function`);
    }

    // Validate NodeJS runtime
    if (
      ![
        lambda.Runtime.NODEJS,
        lambda.Runtime.NODEJS_10_X,
        lambda.Runtime.NODEJS_12_X,
        lambda.Runtime.NODEJS_4_3,
        lambda.Runtime.NODEJS_6_10,
        lambda.Runtime.NODEJS_8_10,
      ].includes(runtime)
    ) {
      throw new Error(
        `The specified runtime is not supported for sst.Function. Only NodeJS runtimes are currently supported.`
      );
    }

    if (root.local) {
      super(scope, id, {
        ...props,
        runtime,
        timeout,
        memorySize,
        tracing,
        code: lambda.Code.fromAsset(
          path.resolve(__dirname, "../dist/stub.zip")
        ),
        handler: "index.main",
        environment: {
          ...(props.environment || {}),
          SST_DEBUG_SRC_PATH: srcPath,
          SST_DEBUG_SRC_HANDLER: handler,
          SST_DEBUG_ENDPOINT: root.debugEndpoint || "",
        },
      });
    } else {
      const { outZip, outHandler } = builder({
        bundle: bundle,
        srcPath: srcPath,
        handler: handler,
        buildDir: root.buildDir,
      });
      super(scope, id, {
        ...props,
        runtime,
        timeout,
        memorySize,
        tracing,
        handler: outHandler,
        code: lambda.Code.fromAsset(outZip),
      });
    }

    // Enable reusing connections with Keep-Alive for NodeJs Lambda function
    this.addEnvironment("AWS_NODEJS_CONNECTION_REUSE_ENABLED", "1", {
      removeInEdge: true,
    });

    // register Lambda function in app
    root.registerLambdaHandler({ srcPath, handler } as FunctionHandlerProps);
  }

  attachPermissions(permissions: FunctionPermissions) {
    let policyActions = [];

    // Four patterns
    //
    // attachPermissions('*');
    // attachPermissions([ 'sns', 'sqs' ]);
    // attachPermissions([ event, queue ]);
    // attachPermissions([
    //   event.snsTopic.grantPublicPermission,
    //   queue.sqsQueue.grantSendMessagesPermission,
    // ]);

    // Case: 'admin' permissions => '*'
    if (typeof permissions === "string") {
      if (permissions === '*') {
        policyActions.push("*");
      }
      else {
        throw new Error(`The specified permissions is not supported.`);
      }
    }
    else {
      permissions.forEach((permission: string | cdk.Construct | {(grantee: iam.IGrantable): iam.Grant}) => {
        // Case: 's3' permissions => 's3:*'
        if (typeof permission === 'string') {
          policyActions.push(`${permission}:*`);
          return;
        }

        // Case: construct => 's3:*'
        if (permission instanceof cdk.Construct) {
          const cfnType = permission.node?.defaultChild?.constructor.name;
          if (cfnType === 'CfnTable' || permission instanceof Table) {
            policyActions.push(`dynamodb:*`);
          }
          else if (cfnType === 'CfnTopic' || permission instanceof Topic) {
            policyActions.push(`sns:*`);
          }
          else if (cfnType === 'CfnQueue' || permission instanceof Queue) {
            policyActions.push(`sqs:*`);
          }
          else if (cfnType === 'CfnBucket') {
            policyActions.push(`s3:*`);
          }
        }
        // Case: grant method
        //else if (permission instanceof sqs.Queue) {
        //  policyActions.push(`sqs:*`);
        //}
        else {
          throw new Error(`The specified permissions is not supported.`);
        }
      });
    }

    if (policyActions.length > 0) {
      this.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: policyActions,
        resources: ["*"],
      }));
    }
  }
}
