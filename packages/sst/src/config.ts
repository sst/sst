import {
  DeleteParameterCommand,
  GetParameterCommand,
  GetParametersByPathCommand,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import {
  GetFunctionConfigurationCommand,
  LambdaClient,
  UpdateFunctionConfigurationCommand,
} from "@aws-sdk/client-lambda";
import { pipe, map } from "remeda";
import { useProject } from "./project.js";
import { useAWSClient } from "./credentials.js";
import { useIOT } from "./iot.js";
import { Stacks } from "./stacks/index.js";
import {
  FunctionMetadata,
  NextjsSiteMetadata,
  AstroSiteMetadata,
  RemixSiteMetadata,
  SolidStartSiteMetadata,
  SvelteKitSiteMetadata,
  SSRSiteMetadata,
} from "./constructs/Metadata.js";

const ssm = useAWSClient(SSMClient);
const FALLBACK_STAGE = ".fallback";
const SECRET_UPDATED_AT_ENV = "SST_ADMIN_SECRET_UPDATED_AT";

const PREFIX = {
  get STAGE() {
    const project = useProject();
    return project.config.ssmPrefix;
  },
  get FALLBACK() {
    const project = useProject();
    return `/sst/${project.config.name}/${FALLBACK_STAGE}/`;
  },
};

declare module "./bus.js" {
  export interface Events {
    "config.secret.updated": { name: string };
  }
}

interface Secret {
  value?: string;
  fallback?: string;
}

export namespace Config {
  export async function parameters() {
    const result: (ReturnType<typeof parse> & { value: string })[] = [];

    for await (const p of scanParameters(PREFIX.FALLBACK)) {
      const parsed = parse(p.Name!, PREFIX.FALLBACK);
      if (parsed.type === "secrets") continue;
      result.push({
        ...parsed,
        value: p.Value!,
      });
    }

    for await (const p of scanParameters(PREFIX.STAGE)) {
      const parsed = parse(p.Name!, PREFIX.STAGE);
      if (parsed.type === "secrets") continue;
      result.push({
        ...parsed,
        value: p.Value!,
      });
    }

    return result;
  }

  export function envFor(input: {
    type: string;
    id: string;
    prop: string;
    fallback?: boolean;
  }) {
    return `SST_${input.type}_${input.prop}_${normalizeID(input.id)}`;
  }

  export function pathFor(input: {
    type: string;
    id: string;
    prop: string;
    fallback?: boolean;
  }) {
    return `${input.fallback ? PREFIX.FALLBACK : PREFIX.STAGE}${
      input.type
    }/${normalizeID(input.id)}/${input.prop}`;
  }

  export function normalizeID(input: string) {
    return input.replace(/-/g, "_");
  }

  export async function secrets() {
    const result: Record<string, Secret> = {};

    for await (const p of scanParameters(PREFIX.STAGE + "Secret")) {
      const parsed = parse(p.Name!, PREFIX.STAGE);
      if (!result[parsed.id]) result[parsed.id] = {};
      result[parsed.id].value = p.Value;
    }

    for await (const p of scanParameters(PREFIX.FALLBACK + "Secret")) {
      const parsed = parse(p.Name!, PREFIX.FALLBACK);
      if (!result[parsed.id]) result[parsed.id] = {};
      result[parsed.id].fallback = p.Value;
    }

    return result;
  }

  export async function env() {
    const project = useProject();

    const parameters = await Config.parameters();

    const env = {
      SST_APP: project.config.name,
      SST_STAGE: project.config.stage,
      ...pipe(
        parameters,
        map((p) => [envFor(p), p.value]),
        Object.fromEntries
      ),
    };

    return env as typeof env & Record<string, string | undefined>;
  }

  export async function setSecret(input: {
    key: string;
    value: string;
    fallback?: boolean;
  }) {
    const paramName = pathFor({
      id: input.key,
      type: "Secret",
      prop: "value",
      fallback: input.fallback,
    });
    try {
      await putParameter(paramName, input.value);
    } catch (e: any) {
      // If the parameter was previously ADVANCED, re-create it in STANDARD tier.
      const wasAdvanced =
        e.name === "ValidationException" &&
        e.message.startsWith(
          "This parameter uses the advanced-parameter tier. You can't downgrade a parameter from the advanced-parameter tier to the standard-parameter tier."
        );
      if (!wasAdvanced) throw e;

      await deleteParameter(paramName);
      await putParameter(paramName, input.value);
    }

    // Publish event
    const iot = await useIOT();
    const topic = `${iot.prefix}/events`;
    await iot.publish(topic, "config.secret.updated", { name: input.key });
  }

  export async function getSecret(input: { key: string; fallback?: boolean }) {
    const result = await getParameter(
      pathFor({
        id: input.key,
        prop: "value",
        type: "Secret",
        fallback: input.fallback,
      })
    );
    return result.Parameter?.Value;
  }

  export async function removeSecret(input: {
    key: string;
    fallback?: boolean;
  }) {
    await deleteParameter(
      pathFor({
        id: input.key,
        type: "Secret",
        prop: "value",
        fallback: input.fallback,
      })
    );
  }

  export async function restart(keys: string[]) {
    const metadata = await Stacks.metadata();
    const siteData = Object.values(metadata)
      .flat()
      .filter(
        (
          c
        ): c is
          | NextjsSiteMetadata
          | AstroSiteMetadata
          | RemixSiteMetadata
          | SolidStartSiteMetadata
          | SvelteKitSiteMetadata =>
          c.type === "AstroSite" ||
          c.type === "NextjsSite" ||
          c.type === "RemixSite" ||
          c.type === "SolidStartSite" ||
          c.type === "SvelteKitSite"
      )
      .filter((c) => keys.some((key) => c.data.secrets.includes(key)));
    const siteDataPlaceholder = siteData.filter(
      (c) => c.data.mode === "placeholder"
    );
    const siteDataEdge = siteData
      .filter((c) => c.data.mode === "deployed")
      .filter((c) => c.data.edge);
    const siteDataRegional = siteData
      .filter((c) => c.data.mode === "deployed")
      .filter((c) => !c.data.edge);
    const regionalSiteArns = siteData.map((s) => s.data.server);
    const functionData = Object.values(metadata)
      .flat()
      .filter((c): c is FunctionMetadata => c.type === "Function")
      // filter out SSR functions for sites
      .filter((c) => !regionalSiteArns.includes(c.data.arn))
      .filter((c) => keys.some((key) => c.data.secrets.includes(key)));

    // Restart sites
    const restartedSites = (
      await Promise.all(
        siteDataRegional.map(async (s) => {
          const restarted = await restartFunction(s.data.server);
          return restarted ? s : restarted;
        })
      )
    ).filter((c): c is SSRSiteMetadata => Boolean(c));

    // Restart functions
    const restartedFunctions = (
      await Promise.all(
        functionData.map(async (f) => {
          const restarted = await restartFunction(f.data.arn);
          return restarted ? f : restarted;
        })
      )
    ).filter((c): c is FunctionMetadata => Boolean(c));

    return {
      edgeSites: siteDataEdge,
      sites: restartedSites,
      placeholderSites: siteDataPlaceholder,
      functions: restartedFunctions,
    };
  }
}

async function* scanParameters(prefix: string) {
  let token: string | undefined;

  while (true) {
    const results = await ssm.send(
      new GetParametersByPathCommand({
        Path: prefix,
        WithDecryption: true,
        Recursive: true,
        NextToken: token,
      })
    );
    yield* results.Parameters || [];

    if (!results.NextToken) break;
    token = results.NextToken;
  }
}

function getParameter(name: string) {
  return ssm.send(
    new GetParameterCommand({
      Name: name,
      WithDecryption: true,
    })
  );
}

function putParameter(name: string, value: string) {
  return ssm.send(
    new PutParameterCommand({
      Name: name,
      Value: value,
      Type: "SecureString",
      Overwrite: true,
      Tier: value.length > 4096 ? "Advanced" : "Standard",
    })
  );
}

function deleteParameter(name: string) {
  return ssm.send(
    new DeleteParameterCommand({
      Name: name,
    })
  );
}

function parse(ssmName: string, prefix: string) {
  const parts = ssmName.substring(prefix.length).split("/");
  return {
    type: parts[0],
    id: parts[1],
    prop: parts.slice(2).join("/"),
  };
}

async function restartFunction(arn: string) {
  const lambda = useAWSClient(LambdaClient);

  // Note: in the case where the function is removed, but the metadata
  //       is not updated, we ignore the Function not found error.
  try {
    const config = await lambda.send(
      new GetFunctionConfigurationCommand({
        FunctionName: arn,
      })
    );

    await lambda.send(
      new UpdateFunctionConfigurationCommand({
        FunctionName: arn,
        Environment: {
          Variables: {
            ...(config.Environment?.Variables || {}),
            [SECRET_UPDATED_AT_ENV]: Date.now().toString(),
          },
        },
      })
    );

    return true;
  } catch (e: any) {
    if (
      e.name === "ResourceNotFoundException" &&
      e.message.startsWith("Function not found")
    ) {
      return;
    }
  }
}
