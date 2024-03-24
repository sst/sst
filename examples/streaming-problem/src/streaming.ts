import { APIGatewayProxyEventV2 } from "aws-lambda";

const TEXT = new Uint8Array(
  Buffer.from("This is a test of a streaming lambda"),
);

export const handler = awslambda.streamifyResponse(
  async (evt: APIGatewayProxyEventV2, responseStream) => {
    const httpResponseMetadata = {
      statusCode: 200,
      headers: {
        "Transfer-Encoding": "chunked",
      },
    };
    const chunkSize = parseInt(evt.queryStringParameters?.chunkSize || "1");
    const delay = parseInt(evt.queryStringParameters?.delay || "100");
    const writer = awslambda.HttpResponseStream.from(
      responseStream,
      httpResponseMetadata,
    );
    for (let i = 0; i < TEXT.length; i += chunkSize) {
      const chunk = TEXT.subarray(i, i + chunkSize);
      writer.write(chunk);
      await new Promise((r) => setTimeout(r, delay));
    }
    writer.end();
  },
);
