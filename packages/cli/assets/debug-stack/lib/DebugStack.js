const cdk = require("@aws-cdk/core");
const s3 = require("@aws-cdk/aws-s3");
const iam = require("@aws-cdk/aws-iam");
const lambda = require("@aws-cdk/aws-lambda");
const apig = require("@aws-cdk/aws-apigatewayv2");
const dynamodb = require("@aws-cdk/aws-dynamodb");
const logs = require("@aws-cdk/aws-logs");

class DebugStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const { stage } = props;

    const _this = this;

    // Create connection table
    const table = new dynamodb.Table(this, "Table", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create S3 bucket for storing large payloads
    const bucket = new s3.Bucket(this, "Bucket", {
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(1),
          prefix: "payloads/",
        },
      ],
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create API
    const api = new apig.CfnApi(this, "Api", {
      name: `${this.stackName}-api`,
      protocolType: "WEBSOCKET",
      routeSelectionExpression: "$request.body.action",
    });
    new apig.CfnStage(this, "ApiStage", {
      apiId: api.ref,
      autoDeploy: true,
      stageName: stage,
    });

    addApiRoute({
      id: "Connect",
      routeKey: "$connect",
      handler: "wsConnect.main",
    });
    addApiRoute({
      id: "Disconnect",
      routeKey: "$disconnect",
      handler: "wsDisconnect.main",
    });
    addApiRoute({
      id: "Default",
      routeKey: "$default",
      handler: "wsDefault.main",
    });

    // Stack Output
    new cdk.CfnOutput(this, "Endpoint", {
      value: `${api.attrApiEndpoint}/${stage}`,
    });
    new cdk.CfnOutput(this, "BucketArn", {
      value: bucket.bucketArn,
    });
    new cdk.CfnOutput(this, "BucketName", {
      value: bucket.bucketName,
    });

    function addApiRoute({ id, routeKey, handler }) {
      // Create execution policy
      const policyStatement = new iam.PolicyStatement();
      policyStatement.addAllResources();
      policyStatement.addActions(
        "apigateway:*",
        "dynamodb:*",
        "execute-api:ManageConnections"
      );

      // Create Lambda
      const lambdaFunc = new lambda.Function(_this, id, {
        code: lambda.Code.fromAsset("lambda"),
        handler,
        timeout: cdk.Duration.seconds(10),
        runtime: lambda.Runtime.NODEJS_12_X,
        memorySize: 256,
        environment: {
          TABLE_NAME: table.tableName,
        },
        initialPolicy: [policyStatement],
        logRetention: logs.RetentionDays.ONE_WEEK,
      });
      lambdaFunc.addPermission(`${id}Permission`, {
        principal: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      });

      // Create API integrations
      const integration = new apig.CfnIntegration(_this, `${id}Integration`, {
        apiId: api.ref,
        integrationType: "AWS_PROXY",
        integrationUri: `arn:aws:apigateway:${_this.region}:lambda:path/2015-03-31/functions/${lambdaFunc.functionArn}/invocations`,
        //credentialsArn: role.roleArn,
      });

      // Create API routes
      new apig.CfnRoute(_this, `${id}Route`, {
        apiId: api.ref,
        routeKey,
        authorizationType: "NONE",
        target: `integrations/${integration.ref}`,
      });
    }
  }
}

module.exports = { DebugStack };
