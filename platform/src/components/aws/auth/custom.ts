import path from "path";
import {
  all,
  ComponentResourceOptions,
  Output,
  output,
  jsonStringify,
} from "@pulumi/pulumi";
import { Plan, SsrSite, SsrSiteArgs } from "../ssr-site.js";
import { createAuthTable } from "./shared.js";
import { transform } from "../../component.js";
import type { Dynamo } from "../dynamo.js";

export class CustomAuth extends SsrSite {
  constructor(
    name: string,
    args: SsrSiteArgs = {},
    opts: ComponentResourceOptions = {},
  ) {
    const { promise: tablePromise, resolve: resolveTable } =
      Promise.withResolvers<Dynamo>();

    super(
      __pulumiType,
      name,
      {
        ...args,
        environment: {
          ...args.environment,
          OPENAUTH_STORAGE: jsonStringify({
            type: "dynamo",
            options: { table: output(tablePromise).name },
          }),
        },
        link: all([args.link, tablePromise]).apply(
          ([prevLinks, tableResolved]) => {
            return [...(prevLinks ?? []), tableResolved];
          },
        ),
        transform: {
          ...args.transform,
          server(serverArgs, opts, fnName) {
            const [_, newArgs] = transform(
              args.transform?.server,
              fnName,
              {
                ...serverArgs,
                url: {
                  cors: false,
                },
              },
              opts,
            );

            Object.assign(serverArgs, newArgs);
          },
        },
      },
      opts,
    );

    const table = createAuthTable(name, { parent: this });
    resolveTable(table);
  }

  protected normalizeBuildCommand() {}

  protected buildPlan(outputPath: Output<string>): Output<Plan> {
    return output(outputPath).apply((outputPath) => {
      const serverPath = path.join(outputPath, ".openauth/build/server");

      return {
        server: {
          bundle: serverPath,
          handler: "index.handler",
          streaming: true,
        },
        assets: [
          {
            from: ".openauth/build/client",
            to: "",
            cached: true,
          },
        ],
      };
    });
  }

  public get url() {
    return super.url;
  }
}

const __pulumiType = "sst:aws:CustomAuth";
// @ts-expect-error
CustomAuth.__pulumiType = __pulumiType;
