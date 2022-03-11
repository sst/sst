import * as cdk from "aws-cdk-lib";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as sst from "@serverless-stack/resources";

export class ReservationLifecycleSM extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    // Define each state
    const sWait = new sfn.Wait(this, "Wait", {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(300)),
    });
    const sHello = new tasks.LambdaInvoke(this, "HelloTask", {
      lambdaFunction: new sst.Function(this, "Hello", {
        handler: "src/lambda.main",
      }),
    });
    const sFailed = new sfn.Fail(this, "Failed");
    const sSuccess = new sfn.Succeed(this, "Success");
    new sfn.StateMachine(this, id, {
      definition: sWait
        .next(sHello)
        .next(
          new sfn.Choice(this, "Job Approved?")
            .when(sfn.Condition.stringEquals("$.status", "Approved"), sSuccess)
            .otherwise(sFailed)
        ),
    });
  }
}

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string, props?: sst.StackProps) {
    super(scope, id, props);

    new ReservationLifecycleSM(this, "StateMachine");
  }
}
