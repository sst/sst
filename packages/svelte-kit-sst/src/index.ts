import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Builder } from "@sveltejs/kit/types";
const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default function () {
  const adapter = {
    name: "svelte-kit-sst",
    async adapt(builder: Builder) {
      const out = path.join(".svelte-kit", "svelte-kit-sst");
      const clientDir = path.join(out, "client");
      const serverDir = path.join(out, "server");
      const prerenderedDir = path.join(out, "prerendered");

      // Cleanup output folder
      builder.rimraf(out);
      builder.mkdirp(clientDir);
      builder.mkdirp(serverDir);
      builder.mkdirp(prerenderedDir);

      // Create static output
      builder.log.minor("Copying assets...");
      builder.writeClient(clientDir);
      const prerenderedFiles = builder.writePrerendered(prerenderedDir);

      // Create Lambda function
      builder.log.minor("Generating server function...");
      builder.writeServer(serverDir);
      // copy over handler files in server handler folder
      builder.copy(
        path.join(__dirname, "handler"),
        path.join(serverDir, "lambda-handler")
      );
      // save a list of files in server handler folder
      fs.writeFileSync(
        path.join(serverDir, "lambda-handler", "prerendered-file-list.js"),
        `export default ${JSON.stringify(prerenderedFiles)}`
      );
    },
  };

  return adapter;
}
