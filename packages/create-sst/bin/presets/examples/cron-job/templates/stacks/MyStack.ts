import { Cron, StackContext } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  new Cron(stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "src/lambda.main",
  });
}
