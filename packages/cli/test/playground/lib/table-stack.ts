import { RemovalPolicy } from "aws-cdk-lib";
import * as sst from "@serverless-stack/resources";

export function MainStack({ stack }: sst.StackContext) {
  const table = new sst.Table(stack, "Table", {
    fields: {
      userId: "string",
      noteId: "string",
    },
    primaryIndex: { partitionKey: "userId2" },
    globalIndexes: {
      niIndex: { partitionKey: "noteId" },
      niUiIndex: { partitionKey: "noteId", sortKey: "userId" },
    },
    cdk: {
      table: {
        removalPolicy: RemovalPolicy.DESTROY,
        timeToLiveAttribute: 'ttl',
      }
    },
    defaults: {
      function: {
        timeout: 3,
      }
    },
    stream: true,
    consumers: {
      consumerA: "src/lambda.main",
    },
  });

  stack.addOutputs({
    TableArn: table.tableArn,
  });
}
