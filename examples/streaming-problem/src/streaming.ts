import { APIGatewayProxyEventV2 } from "aws-lambda";

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
    const data = new Uint8Array(Buffer.from("0".repeat(chunkSize * 10)));
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.subarray(i, i + chunkSize);
      writer.write(chunk, "utf8");
      await new Promise((r) => setTimeout(r, delay));
    }
    writer.end();
  },
);
