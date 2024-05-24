import { bus } from "sst/aws/bus";
import { MyEvent } from "./index";

export const handler = bus.handle(MyEvent, async (evt, raw) => {
  console.log({ evt, raw });
});
