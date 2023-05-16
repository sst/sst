import {
  EventBus,
  FunctionDefinition,
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

  const onFailure = new Queue(stack, `bus-dlq`, {
    consumer: {
      function: {
        handler: "packages/functions/src/events/dlq.handler",
        bind: [redriver],
      },
    },
  });

  function subscribe(name: string, fn: FunctionDefinition) {
    const stripped = name.replace(/\./g, "_");
    bus.addRules(stack, {
      [stripped]: {
        pattern: {
          detailType: [name],
        },
        targets: {
          handler: {
            function: fn,
            cdk: {
              target: {
                retryAttempts: 185,
                maxEventAge: toCdkDuration("10 hours"),
                deadLetterQueue: onFailure.cdk.queue,
              },
            },
          },
        },
      },
    });
  }

  // 1. be opinionated about event shape
  // 2. add more useful bus.subscribe(queue: true)
  // 3. remove the need to call bus.subscribe (detect event handlers) EventHandler
  //    if need custom option, define whole thing in stack code
  // 4. optionally customize in stack code

  const secrets = use(Secrets);
  subscribe("test.event", {
    handler: "packages/functions/src/events/test.handler",
  });

  subscribe("aws.account.created", {
    handler: "packages/functions/src/events/aws-account-created.handler",
  });

  subscribe("app.stage.connected", {
    handler: "packages/functions/src/events/app-stage-connected.handler",
    bind: [...Object.values(secrets.database)],
    permissions: ["sts"],
    onFailure: new LambdaDestination(onFailure.consumerFunction!),
  });

  return bus;
}
