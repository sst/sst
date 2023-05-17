import {
  EventBus,
  FunctionProps,
  Queue,
  StackContext,
  Function,
  toCdkDuration,
  use,
} from "sst/constructs";
import { Secrets } from "./secrets";
import { LambdaDestination } from "aws-cdk-lib/aws-lambda-destinations";

export function Events({ stack }: StackContext) {
  const bus = new EventBus(stack, "bus");

  const redriver = new Queue(stack, `bus-redriver`, {
    consumer: {
      function: {
        handler: "packages/functions/src/events/redriver.handler",
        permissions: ["lambda"],
      },
    },
  });

  const onFailure = new Function(stack, `bus-onFailure`, {
    handler: "packages/functions/src/events/dlq.handler",
    bind: [redriver],
  });

  function subscribe(name: string, fn: FunctionProps) {
    const stripped = name.replace(/\./g, "_");
    bus.addRules(stack, {
      [stripped]: {
        pattern: {
          detailType: [name],
        },
        targets: {
          handler: {
            function: {
              ...fn,
              onFailure: new LambdaDestination(onFailure),
            },
          },
        },
      },
    });
  }

  const secrets = use(Secrets);

  subscribe("aws.account.created", {
    handler: "packages/functions/src/events/aws-account-created.handler",
  });

  subscribe("app.stage.connected", {
    handler: "packages/functions/src/events/app-stage-connected.handler",
    bind: [...Object.values(secrets.database)],
    permissions: ["sts"],
  });

  return bus;
}
