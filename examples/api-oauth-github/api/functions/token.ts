import fetch from "node-fetch";
import parser from "lambda-multipart-parser";

import { APIGatewayProxyHandlerV2 } from "aws-lambda";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const result = await parser.parse(event);
  const token = await (
    await fetch(
      `https://github.com/login/oauth/access_token?client_id=${result.client_id}&client_secret=${result.client_secret}&code=${result.code}`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
        },
      }
    )
  ).json();

  return token;
};
