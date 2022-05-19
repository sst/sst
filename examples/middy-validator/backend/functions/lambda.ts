import middy from "@middy/core";
import validator from "@middy/validator";
import httpErrorHandler from "@middy/http-error-handler";
import jsonBodyParser from "@middy/http-json-body-parser";

const baseHandler = (event) => {
  const { fname, lname } = event.body;
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: `Hello, ${fname}-${lname}.`,
  };
};

const inputSchema = {
  type: "object",
  properties: {
    body: {
      type: "object",
      properties: {
        fname: { type: "string" },
        lname: { type: "string" },
      },
      required: ["fname", "lname"],
    },
  },
};

const outputSchema = {
  type: "object",
  required: ["body", "statusCode"],
  properties: {
    body: {
      type: "string",
    },
    statusCode: {
      type: "number",
    },
    headers: {
      type: "object",
    },
  },
};

const handler = middy(baseHandler)
  .use(jsonBodyParser())
  .use(
    validator({
      inputSchema,
      outputSchema,
    })
  )
  .use(httpErrorHandler());

export { handler };
