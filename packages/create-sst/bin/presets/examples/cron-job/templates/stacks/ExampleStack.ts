import { Cron, StackContext } from "sst/constructs";

export function ExampleStack({ stack }: StackContext) {
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "packages/functions/srclambda.main",
  });
}
