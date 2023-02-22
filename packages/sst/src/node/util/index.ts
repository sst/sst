import {
  GetParametersCommand,
  SSMClient,
  Parameter,
} from "@aws-sdk/client-ssm";
const ssm = new SSMClient({});

// Example:
// {
//   Bucket: {
//     myBucket: {
//       name: "my-bucket",
//     }
//   }
// }
let allVariables: Record<string, Record<string, Record<string, string>>> = {};
await parseEnvironment();

interface Variable {
  constructName: string;
  constructId: string;
  propName: string;
}

export function createProxy<T extends object>(constructName: string) {
  return new Proxy<T>({} as any, {
    get(target, prop) {
      if (typeof prop === "string") {
        // normalize prop to convert kebab cases like `my-table` to `my_table`
        const normProp = normalizeId(prop);
        if (!(normProp in target)) {
          throw new Error(
            `Cannot use ${constructName}.${String(
              prop
            )}. Please make sure it is bound to this function.`
          );
        }
        return Reflect.get(target, normProp);
      }
      return Reflect.get(target, prop);
    },
  });
}

export function getVariables(constructName: string) {
  return allVariables[constructName] || {};
}

async function parseEnvironment() {
  const variablesFromSsm: Variable[] = [];
  const variablesFromSecret: [Variable, string][] = [];

  Object.keys(process.env)
    .filter((name) => name.startsWith("SST_"))
    .forEach((name) => {
      const variable = parseEnvName(name);
      // Ignore if env var is not in the correct format
      if (
        !variable.constructName ||
        !variable.constructId ||
        !variable.propName
      ) {
        return;
      }

      const value = process.env[name]!;
      if (value === "__FETCH_FROM_SSM__") {
        variablesFromSsm.push(variable);
      } else if (value.startsWith("__FETCH_FROM_SECRET__:")) {
        variablesFromSecret.push([variable, value!.split(":")[1]]);
      } else {
        storeVariable(variable, value);
      }
    });

  // Fetch values from SSM
  await fetchValuesFromSSM(variablesFromSsm);

  // Fetch values from Secrets
  variablesFromSecret.forEach(([variable, secretName]) => {
    const value = allVariables["Secret"]?.[secretName]?.value;
    if (value) {
      storeVariable(variable, value);
    }
  });

  return allVariables;
}

async function fetchValuesFromSSM(variablesFromSsm: Variable[]) {
  // Get all env vars that need to be fetched from SSM
  const ssmPaths = variablesFromSsm.map((variable) => buildSsmPath(variable));
  if (ssmPaths.length === 0) return;

  // Fetch
  const results = await loadSecrets(ssmPaths);
  results.validParams.forEach((item) => {
    const variable = parseSsmPath(item.Name!);
    storeVariable(variable, item.Value!);
  });

  // Get all fallback values to be fetched
  const ssmFallbackPaths = results.invalidParams
    .map((name) => parseSsmPath(name))
    .filter((variable) => variable.constructName === "Secret")
    .map((variable) => buildSsmFallbackPath(variable));
  if (ssmFallbackPaths.length === 0) return;

  // Fetch fallback values
  const fallbackResults = await loadSecrets(ssmFallbackPaths);
  fallbackResults.validParams.forEach((item) => {
    const variable = parseSsmFallbackPath(item.Name!);
    storeVariable(variable, item.Value!);
  });
}

async function loadSecrets(paths: string[]) {
  // Split paths into chunks of 10
  const chunks = [];
  for (let i = 0; i < paths.length; i += 10) {
    chunks.push(paths.slice(i, i + 10));
  }

  // Fetch secrets
  const validParams: Parameter[] = [];
  const invalidParams: string[] = [];
  await Promise.all(
    chunks.map(async (chunk) => {
      const command = new GetParametersCommand({
        Names: chunk,
        WithDecryption: true,
      });
      const result = await ssm.send(command);
      validParams.push(...(result.Parameters || []));
      invalidParams.push(...(result.InvalidParameters || []));
    })
  );
  return { validParams, invalidParams };
}

function parseEnvName(env: string) {
  const [_SST, constructName, propName, ...idParts] = env.split("_");
  return {
    constructName,
    constructId: idParts.join("_"),
    propName,
  } as Variable;
}

function parseSsmPath(path: string) {
  const prefix = ssmPrefix();
  const parts = path.substring(prefix.length).split("/");
  return {
    constructName: parts[0],
    constructId: parts[1],
    propName: parts[2],
  } as Variable;
}

function parseSsmFallbackPath(path: string) {
  const parts = path.split("/");
  return {
    constructName: parts[4],
    constructId: parts[5],
    propName: parts[6],
  } as Variable;
}

function buildSsmPath(data: Variable) {
  return `${ssmPrefix()}${data.constructName}/${data.constructId}/${
    data.propName
  }`;
}

function buildSsmFallbackPath(data: Variable) {
  return `/sst/${process.env.SST_APP}/.fallback/${data.constructName}/${data.constructId}/${data.propName}`;
}

function normalizeId(name: string) {
  return name.replace(/-/g, "_");
}

function ssmPrefix() {
  return process.env.SST_SSM_PREFIX || "";
}

function storeVariable(variable: Variable, value: string) {
  const { constructId: id, constructName: c, propName: prop } = variable;
  allVariables[c] = allVariables[c] || {};
  allVariables[c][id] = allVariables[c][id] || {};
  allVariables[c][id][prop] = value;
}
