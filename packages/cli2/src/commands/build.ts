import { Stacks } from "../stacks/index.js";
import { useConfig } from "../config/index.js";
import { Logger } from "../logger/index.js";
import fs from "fs/promises";
import path from "path";
import {
  useAWSClient,
  useAWSCredentials,
  useSTSIdentity
} from "../credentials/index.js";
import {
  CloudFormationClient,
  UpdateStackCommand
} from "@aws-sdk/client-cloudformation";

export async function Build() {
  Logger.debug("Building stacks...");
  await Stacks.build();
  Logger.debug("Finished building");
  Logger.debug("Building stacks...");
  const fn = await Stacks.build();
  Logger.debug("Finished building");
  const cfg = await useConfig();

  Logger.debug("Synthesizing stacks...");
  const identity = await useSTSIdentity();
  const { App } = await import("@serverless-stack/resources");
  const app = new App(
    {
      account: identity.Account!,
      stage: cfg.stage,
      name: cfg.name,
      region: cfg.region,
      buildDir: ".sst/stacks/",
      skipBuild: true
    },
    {
      outdir: ".sst/out/"
    }
  );
  try {
    await fn(app);
    const assembly = app.synth();
    const stack = assembly.stacks[0];
    console.log(assembly.directory, stack.stackName, stack.templateFile);
    const cfn = await useAWSClient(CloudFormationClient);
    const result = await cfn.send(
      new UpdateStackCommand({
        StackName: stack.stackName,
        TemplateBody: await fs
          .readFile(path.join(assembly.directory, stack.templateFile))
          .then(x => x.toString()),
        Capabilities: ["CAPABILITY_IAM"]
      })
    );
    console.log(result);
    Logger.debug("Finished synthesizing");
  } catch (err) {
    throw err;
  }
}
