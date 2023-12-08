// TODO remove
import { LocalWorkspace } from "@pulumi/pulumi/automation/index.js";
await LocalWorkspace.createOrSelectStack(
  {
    program: () => "run",
    projectName: app.name,
    stackName: app.stage,
  },
  {
    projectSettings: {
      config: {
        "aws:defaultTags": {
          default
          "x-sst-app": app.name,
          "x-sst-stage": app.stage,
        },
      },
      runtime: {
        options: {
        }
      }
    },
    stackSettings: {
    }
  }
);

