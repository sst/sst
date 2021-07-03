import * as sqs from "@aws-cdk/aws-sqs";
import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  public readonly api: sst.Api;

  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    new sst.Auth(this, "Auth", {
      cognito: true,
    });

    const q1 = new sst.Queue(this, "MyQueue", {
      consumer: "src/lambda.main",
    });

    new sst.Queue(this, "Queue2", {
      sqsQueue: q1.sqsQueue,
      consumer: "src/lambda.main",
    });

    new sst.Queue(this, "DQueue", {
      sqsQueue: sqs.Queue.fromQueueArn(
        this,
        "IQueue",
        "arn:aws:sqs:us-east-1:112245769880:delete"
      ),
      consumer: "src/lambda.main",
    });

    const api = new sst.Api(this, "Api", {
      customDomain: "api.sst.sh",
      defaultFunctionProps: {
        timeout: 10,
      },
      routes: {
        "GET /": "src/lambda.main",
        $default: "src/lambda.main",
      },
    });

    this.api = api;

    this.addOutputs({
      Endpoint: api.url || "no-url",
      CustomEndpoint: api.customDomainUrl || "no-custom-url",
    });

    this.exportValue(api.url);
  }
}
