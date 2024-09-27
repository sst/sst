import { z } from "zod";
import {
  awsLambdaRequestHandler,
  CreateAWSLambdaContextOptions
} from "@trpc/server/adapters/aws-lambda";
import { initTRPC } from "@trpc/server";
import { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from "aws-lambda";

const t = initTRPC
  .context<CreateAWSLambdaContextOptions<APIGatewayProxyEvent | APIGatewayProxyEventV2>>()
  .create();

const router = t.router({
  greet: t.procedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return `Hello ${input.name}!`;
    }),
});

export type Router = typeof router;

export const handler = awsLambdaRequestHandler({
  router: router,
  createContext: (opts) => opts,
});
