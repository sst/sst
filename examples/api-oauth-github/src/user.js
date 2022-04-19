import fetch from "node-fetch";

export async function handler(event) {
  const token = await (
    await fetch("https://api.github.com/user", {
      method: "GET",
      headers: {
        authorization:
          "token " + event.headers["authorization"].split("Bearer ")[1],
        accept: "application/json",
      },
    })
  ).json();

  return {
    sub: token.id,
    ...token,
  };
}
