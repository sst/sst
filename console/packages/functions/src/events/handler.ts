import { Actor } from "@console/core/actor";
import { Events, EventName } from "@console/core/bus";
import { SQSEvent } from "aws-lambda";
import { Handler } from "sst/context";

export function EventHandler<Name extends EventName>(
  _name: Name,
  cb: (properties: Events[Name], actor: Actor) => Promise<void>
) {
  return async (event: SQSEvent) => {
    const failures = [];
    for (const record of event.Records) {
      const parsed = JSON.parse(record.body);
      try {
        await cb(parsed.detail.properties, parsed.detail.actor);
      } catch (ex) {
        console.error(ex);
        failures.push(record.messageId);
      }
    }

    return {
      batchItemFailures: failures.map((i) => ({
        itemIdentifier: i,
      })),
    };
  };
}
