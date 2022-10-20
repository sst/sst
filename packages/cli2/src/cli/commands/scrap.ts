import { useBus } from "../../bus/index.js";
import { useIOT } from "../../iot/index.js";

declare module "../../bus/index.js" {
  export interface Events {}
}

export async function Scrap() {}
