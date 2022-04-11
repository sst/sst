import { App, Cron, StackContext } from "@serverless-stack/resources";

function MyStack(props: StackContext) {
  new Cron(props.stack, "Cron", {
    schedule: "rate(1 minute)",
    job: "src/lambda.main",
  });
}

export default async function main(app: App) {
  app.stack(MyStack);
}
