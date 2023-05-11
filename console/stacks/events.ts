import {
  EventBus,
  FunctionDefinition,
  Queue,
  StackContext,
  use,
} from "sst/constructs";
import { Secrets } from "./secrets";
import type { Stage } from "../packages/core/src/app/stage";

export function Events({ stack }: StackContext) {
  const bus = new EventBus(stack, "bus");

  function subscribe(name: string, fn: FunctionDefinition) {
    const stripped = name.replace(/\./g, "_");
    bus.addRules(stack, {
      [stripped]: {
        pattern: {
          detailType: [name],
        },
        targets: {
          handler: {
            type: "queue",
            queue: new Queue(stack, `${stripped}-handler-queue`, {
              consumer: {
                cdk: {
                  eventSource: {
                    reportBatchItemFailures: true,
                  },
                },
                function: fn,
              },
            }),
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
  });

  return bus;
}
