import Sentry from "@sentry/serverless";

export const handler = Sentry.AWSLambda.wrapHandler(async (event) => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: `Hello, World! Your request was received at ${event.requestContext.time}.`,
  };
});
