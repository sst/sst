import { Config } from "@core/config.js";

interface Input {}
export async function bind(input: Input) {
  const env = await Config.env();
  console.log(env);
}
