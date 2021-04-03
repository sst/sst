import mirrarray from "mirrarray";
import { v4 as uuidv4 } from "uuid";

export async function handler() {
  mirrarray(["this", "that", "another"]);
  uuidv4();
  return "src/lambda.js";
}
