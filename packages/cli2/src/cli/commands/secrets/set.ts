import { Config } from "@core/config.js";
import { blue } from "colorette";

interface Input {
  key: string;
  value: string;
}
export async function set(input: Input) {
  console.log("Setting", `${blue(input.key)}...`);
  await Config.setSecret(input.key, input.value);
  console.log("Restarting all functions using", `${blue(input.key)}...`);
  const count = await Config.restart(input.key);
  console.log("✅ Restarted", `${blue(count)}`, "functions");
}
