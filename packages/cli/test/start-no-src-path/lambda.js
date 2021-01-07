import mirrarray from "mirrarray";

import str from "./lib";

export async function handler() {
  mirrarray(["this", "that", "another"]);

  return "Hello World: " + str("Spongebob");
}
