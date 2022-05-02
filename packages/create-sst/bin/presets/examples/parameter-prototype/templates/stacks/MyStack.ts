import {
  Function,
  StackContext,
  Table,
  use,
} from "@serverless-stack/resources";
import { Parameter } from "./Parameter";

export function MyStack({ stack, app }: StackContext) {
  const table = new Table(stack, "Counter", {
    fields: {
      counter: "string",
    },
    primaryIndex: { partitionKey: "counter" },
  });

  return Parameter.create(stack, {
    DYNAMO_TABLE: table.tableName,
    MY_SECRET: Parameter.Secret,
  });
}

export function OtherStack({ stack }: StackContext) {
  const mystack = use(MyStack);
  const func = new Function(stack, "MyFunction", {
    handler: "functions/hello.handler",
  });
  Parameter.use(func, mystack.MY_SECRET, mystack.DYNAMO_TABLE);
}
