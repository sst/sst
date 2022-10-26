import { Config } from "@core/config.js";
import { useAWSCredentials } from "@core/credentials";
import { spawnSync } from "child_process";

interface Input {
  command: string;
}

export async function bind(input: Input) {
  const env = await Config.env();
  const credentials = await useAWSCredentials();
  const result = spawnSync(input.command, {
    env: {
      ...env,
      AWS_ACCESS_KEY_ID: credentials.accessKeyId,
      AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
      AWS_SESSION_TOKEN: credentials.sessionToken,
    },
    stdio: "inherit",
    shell: true,
  });
  process.exitCode = result.status || undefined;
}
