import { AwsOptions, client } from "../aws/client.js";
import { Resource } from "../resource.js";
import { event } from "../event/index.js";
import { EventBridgeEvent, EventBridgeHandler } from "aws-lambda";

export module bus {
  export type Name = Extract<typeof Resource, { type: "sst.aws.Bus" }>["name"];

  function url(options?: AwsOptions) {
    const region = options?.region || client.region;
    return `https://events.${region}.amazonaws.com/`;
  }

  export function handle<Events extends event.Definition>(
    _events: Events | Events[],
    cb: (
      input: {
        [K in Events["type"]]: Extract<Events, { type: K }>["$payload"];
      }[Events["type"]],
      raw: EventBridgeEvent<string, any>,
    ) => Promise<void>,
  ): EventBridgeHandler<string, any, void> {
    return async function (event) {
      const payload = {
        type: event["detail-type"],
        properties: event.detail.properties,
        metadata: event.detail.metadata,
      };
      return cb(payload, event);
    };
  }

  export async function publish<Definition extends event.Definition>(
    name: string | { name: string },
    def: Definition,
    properties: Definition["$input"],
    options?: {
      aws?: AwsOptions;
    },
  ): Promise<any> {
    const u = url(options?.aws);
    const evt = await def.create(properties);
    const res = await client.fetch(u, {
      method: "POST",
      aws: options?.aws,
      headers: {
        "X-Amz-Target": "AWSEvents.PutEvents",
        "Content-Type": "application/x-amz-json-1.1",
      },
      body: JSON.stringify({
        Entries: [
          {
            Source: [Resource.App.name, Resource.App.stage].join("."),
            DetailType: evt.type,
            Detail: JSON.stringify({
              metadata: evt.metadata,
              payload: evt.properties,
            }),
            EventBusName: typeof name === "string" ? name : name.name,
          },
        ],
      }),
    });
    if (!res.ok) throw new PublishError(res);
    return res.json();
  }

  export class PublishError extends Error {
    constructor(public readonly response: Response) {
      super("Failed to publish event to bus");
    }
  }
}
