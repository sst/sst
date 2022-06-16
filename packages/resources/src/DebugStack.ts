import * as path from "path";
import url from "url";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apig from "aws-cdk-lib/aws-apigatewayv2";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { DebugApp } from "./DebugApp.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/**
 * Stack properties for the DebugStack.
 */
export interface DebugStackProps extends cdk.StackProps {
  /**
   * S3 bucket to store large websocket payloads.
   */
  payloadBucketArn?: string;
  /**
   * Lambda function props for WebSocket request handlers.
   */
  websocketHandlerRoleArn?: string;
  cdk?: {
    /**
     * Override the settings of the internally created DynamoDB table
     */
    table?: Omit<dynamodb.TableProps, "partitionKey" | "sortKey">;
  };
}

/**
 * The `DebugStack` construct is used internally to create the resources needed to power [Live Lambda Development](../live-lambda-development). Note that, the `DebugStack` construct should only be created inside the [`DebugApp`](DebugApp).
 *
 * It extends [`cdk.Stack`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Stack.html). It automatically prefixes the stack names with the stage and app name to ensure that they can be deployed to multiple regions in the same AWS account. It also ensures that the stack uses the same AWS profile and region as the app.
 *
 * @example
 */
export class DebugStack extends cdk.Stack {
  public readonly stage: string;
  private readonly api: apig.CfnApi;
  private readonly table: dynamodb.Table;
  private readonly bucket: s3.IBucket;

  constructor(scope: Construct, id: string, props?: DebugStackProps) {
    const app = scope.node.root as DebugApp;
    const stackId = app.logicalPrefixedName(id);

    DebugStack.checkForEnvInProps(id, props);

    super(scope, stackId, {
      ...props,
      env: {
        account: app.account,
        region: app.region,
      },
    });

    this.stage = app.stage;

    // Create connection table
    this.table = new dynamodb.Table(this, "Table", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      ...props?.cdk?.table,
    });

    // Create S3 bucket for storing large payloads
    this.bucket = props?.payloadBucketArn
      ? s3.Bucket.fromBucketArn(this, "Bucket", props.payloadBucketArn)
      : new s3.Bucket(this, "Bucket", {
          lifecycleRules: [
            {
              expiration: cdk.Duration.days(1),
              prefix: "payloads/",
            },
          ],
          encryption: s3.BucketEncryption.S3_MANAGED,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
          autoDeleteObjects: true,
          blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        });

    // Create API
    this.api = new apig.CfnApi(this, "Api", {
      name: `${this.stackName}-api`,
      protocolType: "WEBSOCKET",
      routeSelectionExpression: "$request.body.action",
    });
    new apig.CfnStage(this, "ApiStage", {
      apiId: this.api.ref,
      autoDeploy: true,
      stageName: this.stage,
    });

    // Create API routes
    const role = props?.websocketHandlerRoleArn
      ? iam.Role.fromRoleArn(this, "HandlerRole", props.websocketHandlerRoleArn)
      : undefined;
    this.addApiRoute("Connect", "$connect", "wsConnect.main", role);
    this.addApiRoute("Disconnect", "$disconnect", "wsDisconnect.main", role);
    this.addApiRoute("Default", "$default", "wsDefault.main", role);

    // Stack Output
    new cdk.CfnOutput(this, "Endpoint", {
      value: `${this.api.attrApiEndpoint}/${this.stage}`,
    });
    new cdk.CfnOutput(this, "BucketArn", {
      value: this.bucket.bucketArn,
    });
    new cdk.CfnOutput(this, "BucketName", {
      value: this.bucket.bucketName,
    });
  }

  private addApiRoute(
    id: string,
    routeKey: string,
    handler: string,
    role?: iam.IRole
  ) {
    // Create execution policy
    const policyStatement = new iam.PolicyStatement();
    policyStatement.addAllResources();
    policyStatement.addActions(
      "apigateway:*",
      "dynamodb:*",
      "execute-api:ManageConnections"
    );

    // Create Lambda
    const lambdaFunc = new lambda.Function(this, id, {
      code: lambda.Code.fromAsset(path.join(__dirname, "../assets/DebugStack")),
      handler,
      runtime: lambda.Runtime.NODEJS_12_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      logRetention: logs.RetentionDays.ONE_WEEK,
      logRetentionRole: role,
      environment: {
        TABLE_NAME: this.table.tableName,
      },
      role,
      initialPolicy: [policyStatement],
    });
    lambdaFunc.addPermission(`${id}Permission`, {
      principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });

    // Create API integrations
    const integration = new apig.CfnIntegration(this, `${id}Integration`, {
      apiId: this.api.ref,
      integrationType: "AWS_PROXY",
      integrationUri: `arn:${this.partition}:apigateway:${this.region}:lambda:path/2015-03-31/functions/${lambdaFunc.functionArn}/invocations`,
    });

    // Create API routes
    new apig.CfnRoute(this, `${id}Route`, {
      apiId: this.api.ref,
      routeKey,
      authorizationType: "NONE",
      target: `integrations/${integration.ref}`,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static checkForEnvInProps(id: string, props?: any) {
    if (props && props.env) {
      let envS = "";

      try {
        envS = " (" + JSON.stringify(props.env) + ")";
      } catch (e) {
        // Ignore
      }

      throw new Error(
        `Do not set the "env" prop while initializing "${id}" stack${envS}. Use the "AWS_PROFILE" environment variable and "--region" CLI option instead.`
      );
    }
  }
}
