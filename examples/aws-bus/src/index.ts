import { event } from "sst/event";
import { bus } from "sst/aws/bus";
import { z } from "zod";
import { Resource } from "sst";

const defineEvent = event.builder({
  validator: event.ZodValidator,
  metadataFn: (type, properties) => {
    console.log("sending event", type, properties);
    return {};
  },
});

export const MyEvent = defineEvent(
  "app.myevent",
  z.object({
    foo: z.string(),
  }),
);

export async function handler() {
  await bus.publish(Resource.Bus, MyEvent, { foo: "hello" });
  return {
    statusCode: 200,
  };
}
