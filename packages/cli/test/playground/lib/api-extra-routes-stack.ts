import * as sst from "@serverless-stack/resources";
import { MainStack as ApiStack } from "./api-stack";

export function MainStack({ stack }: sst.StackContext) {
  const { api } = sst.use(ApiStack);

  api.addRoutes(stack, {
    "GET /extraRoute1": "src/lambda.main",
    "POST /extraRoute2": "src/lambda.main",
  });
}
