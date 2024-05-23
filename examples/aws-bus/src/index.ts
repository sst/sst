import { EventClient, ZodValidator } from "sst/event/index";
import { z } from "zod";
import { Resource } from "sst";
import { AwsClient } from "aws4fetch";
import { text } from "node:stream/consumers";
import { Readable } from "node:stream";

const event = EventClient({
  validator: ZodValidator,
});

const MyEvent = event(
  "app.myevent",
  z.object({
    foo: z.string(),
  }),
);

// https://developers.cloudflare.com/workers/reference/apis/environment-variables/#secrets
const aws = new AwsClient({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
});

const EVENTS_API = "https://events.us-east-1.amazonaws.com";

// GOAL:
// event.publish(Resource.Bus, { foo: "hello" })
// export const handler = EventHandler([MyEvent], async (event) => {
// })

export async function handler(evt: any) {
  const event = await MyEvent.create({
    foo: "bar",
  });
  const req = await aws.sign(EVENTS_API, {
    method: "POST",
    aws: {
      service: "events",
      region: "us-east-1",
    },
    headers: {
      "X-Amz-Target": "AWSEvents.PutEvents",
    },
    body: JSON.stringify({
      Entries: [
        {
          Source: [Resource.App.name, Resource.App.stage].join("."),
          DetailType: event.type,
          Detail: JSON.stringify({
            metadata: event.metadata,
            payload: event.properties,
          }),
          EventBusName: Resource.Bus.name,
        },
      ],
    }),
  });
  console.log(req);

  const res = await aws.fetch(EVENTS_API, {
    method: "POST",
    headers: {
      "X-Amz-Target": "AWSEvents.PutEvents",
      "Content-Type": "application/x-amz-json-1.1",
    },
    body: JSON.stringify({
      Entries: [
        {
          Source: [Resource.App.name, Resource.App.stage].join("."),
          DetailType: event.type,
          Detail: JSON.stringify({
            metadata: event.metadata,
            payload: event.properties,
          }),
          EventBusName: Resource.Bus.name,
        },
      ],
    }),
  });
  console.log(res.status, res.statusText, await res.text());
  return {
    statusCode: 200,
    body: JSON.stringify(res),
  };
}
