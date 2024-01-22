import { Resource } from "sst";
import { AwsClient } from "aws4fetch";
import { XMLParser } from "fast-xml-parser";

export interface Env {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
}

const S3_API = `https://${Resource.MyBucket.bucketName}.s3.us-east-1.amazonaws.com`;
const parser = new XMLParser({
  ignoreAttributes: false,
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const aws = new AwsClient({
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    });
    const ret = await aws.fetch(`${S3_API}`, {
      headers: {
        Accept: "application/json",
      },
    });
    const data = await ret.text();

    const html = `<!DOCTYPE html>
    <body>
      <h1>Hello World from a Cloudflare Worker</h1>
      <hr/>
      <pre>List of AWS resources I have access to:</pre>
      <pre>- env.AWS_ACCESS_KEY_ID: ${env.AWS_ACCESS_KEY_ID}</pre>
      <pre>- env.AWS_SECRET_ACCESS_KEY: ${env.AWS_SECRET_ACCESS_KEY}</pre>
      <pre>- Resource.MyBucket: ${JSON.stringify(Resource.MyBucket)}</pre>
      <hr/>
      <pre>Items in the bucket:</pre>
      <pre>${JSON.stringify(parser.parse(data).ListBucketResult, null, 2)}</pre>
    </body>`;

    return new Response(html, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
    });
  },
};
