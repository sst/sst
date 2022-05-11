import fetch from "node-fetch";
import parser from "lambda-multipart-parser";

export async function handler(event) {
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
}
