import { useBus } from "@core/bus.js";
import { useIOT } from "@core/iot.js";

declare module "@core/bus.js" {
  export interface Events {}
}

export async function Scrap() {}
