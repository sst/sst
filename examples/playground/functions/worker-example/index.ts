import { Resource } from "sst";

export interface Env {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const html = `<!DOCTYPE html>
    <body>
      <h1>Hello World from a Cloudflare Worker</h1>
      <hr/>
      <pre>List of AWS resources I have access to:</pre>
      <pre>- env.AWS_ACCESS_KEY_ID: ${env.AWS_ACCESS_KEY_ID}</pre>
      <pre>- env.AWS_SECRET_ACCESS_KEY: ${env.AWS_SECRET_ACCESS_KEY}</pre>
      <pre>- Resource.MyBucket: ${JSON.stringify(Resource.MyBucket)}</pre>
    </body>`;

    return new Response(html, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
    });
  },
};
