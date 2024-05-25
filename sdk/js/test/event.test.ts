import { bus } from "../src/aws/bus.js";
import { event } from "../src/event/index.js";
import { z } from "zod";

const defineEvent = event.builder({
  metadata(type, properties) {
    return {
      traceID: "123",
    };
  },
});

const MyEvent = defineEvent(
  "MyEvent",
  z.object({
    foo: z.string(),
  }),
);
