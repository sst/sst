import {
  EventBus,
  FunctionDefinition,
  Queue,
  StackContext,
} from "sst/constructs";

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

  subscribe("test.event", {
    handler: "packages/functions/src/events/test.handler",
  });

  subscribe("aws.account.created", {
    handler: "packages/functions/src/events/aws-account-created.handler",
  });

  return bus;
}
