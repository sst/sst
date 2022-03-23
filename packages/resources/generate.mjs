import fs from "fs/promises";
import {
  Application,
  TSConfigReader,
  JSONOutput,
  ProjectReflection,
  ReflectionKind,
} from "typedoc";
import path from "path";

const app = new Application();
app.options.addReader(new TSConfigReader());
app.bootstrap({
  entryPoints: [
    "./src/Api.ts",
    "./src/ApiGatewayV1Api.ts",
    "./src/App.ts",
    "./src/Cron.ts",
    "./src/RDS.ts",
    "./src/Auth.ts",
    "./src/Table.ts",
    "./src/Topic.ts",
    "./src/Script.ts",
    "./src/Queue.ts",
    "./src/Bucket.ts",
    "./src/Function.ts",
    "./src/EventBus.ts",
    "./src/StaticSite.ts",
    "./src/NextjsSite.ts",
    "./src/AppSyncApi.ts",
    "./src/GraphQLApi.ts",
    "./src/ViteStaticSite.ts",
    "./src/KinesisStream.ts",
    "./src/WebSocketApi.ts",
    "./src/ReactStaticSite.ts",
  ],
  tsconfig: path.resolve("./tsconfig.json"),
  preserveWatchOutput: true,
});

// Triggers twice on file change for some reason
app.convertAndWatch(async (reflection) => {
  await app.generateJson(reflection, "out.json");
  const json = await fs.readFile("./out.json").then(JSON.parse);
  await run(json);
  console.log("Generated docs");
});

/** @param json {JSONOutput.ModelToObject<ProjectReflection>} */
async function run(json) {
  for (const file of json.children) {
    /** @type {(string | string[] | undefined)[]} */
    const lines = [];
    const construct = file.children?.find((c) => c.kindString === "Class");
    if (!construct) {
      console.log("Skipping", file.name);
      continue;
    }
    lines.push("---");
    lines.push(
      `description: "Docs for the sst.${file.name} construct in the @serverless-stack/resources package"`
    );
    lines.push("---");
    lines.push(
      `<!--`,
      `!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`,
      `!!                                                           !!`,
      `!!  This file has been automatically generated, do not edit  !!`,
      `!!                                                           !!`,
      `!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`,
      `-->`
    );

    lines.push(construct.comment?.shortText);
    if (construct.comment?.text) lines.push("\n" + construct.comment?.text);

    // Constructor
    const constructor = construct.children?.find(
      (c) => c.kindString === "Constructor"
    );
    if (!constructor)
      throw new Error(`Could not find Constructor in ${file.name}`);
    lines.push("\n## Constructor");
    for (const signature of constructor.signatures) {
      lines.push("```ts");
      lines.push(
        `${signature.name}(${signature.parameters
          .map(
            (p) => `${p.name}: ${"name" in p.type ? p.type.name : "unknown"}`
          )
          .join(", ")})`
      );
      lines.push("```");

      lines.push("_Parameters_");
      lines.push();
      for (let parameter of signature.parameters) {
        lines.push(
          `- __${parameter.name}__ ${renderType(
            file,
            parameter.name,
            parameter.type
          )}`
        );
      }
    }

    // Class examples
    const examples =
      construct.comment?.tags?.filter((t) => t.tag === "example") || [];
    if (examples.length) {
      lines.push("\n## Examples");
      lines.push(...examples.map(renderTag));
    }

    // Properties
    lines.push("## Properties");
    lines.push(
      `An instance of \`${construct.name}\` has the following properties.`
    );
    lines.push(...renderProperties(file, construct.children, "", true));

    // Methods
    const methods =
      construct.children?.filter(
        (c) =>
          c.kindString === "Method" &&
          c.flags.isPublic &&
          !c.flags.isExternal &&
          !c.implementationOf
      ) || [];
    if (methods.length) {
      lines.push("## Methods");
      lines.push(
        `An instance of \`${construct.name}\` has the following methods.`
      );
      for (const method of methods) {
        lines.push(`### ${method.name}\n`);
        for (const signature of method.signatures) {
          lines.push("```ts");
          lines.push(
            `${signature.name}(${signature.parameters
              ?.map(
                (p) =>
                  `${p.name}: ${"name" in p.type ? p.type.name : "unknown"}`
              )
              .join(", ")})`
          );
          lines.push("```");
          if (signature.parameters) {
            lines.push("_Parameters_");
            lines.push();
            for (let parameter of signature.parameters) {
              lines.push(
                `- __${parameter.name}__ ${renderType(
                  file,
                  parameter.name,
                  parameter.type
                )}`
              );
            }
          }
          if (signature.comment) {
            lines.push("\n");
            lines.push(signature.comment.shortText);
            lines.push(signature.comment.text);
            const tags = signature.comment.tags || [];
            const examples = tags.filter((x) => x.tag === "example");
            if (examples.length) {
              lines.push("#### Examples");
              lines.push(...examples.map(renderTag));
            }
            lines.push(
              ...tags.filter((x) => x.tag !== "example").map(renderTag)
            );
          }
        }
      }
    }

    for (const child of (file.children || []).sort((a, b) => a.name.length - b.name.length)) {
      if (child.kindString === "Interface") {
        lines.push(`## ${child.name}`);
        lines.push(child.comment?.shortText);
        lines.push(child.comment?.text);
        const examples =
          child.comment?.tags?.filter((x) => x.tag === "example") || [];
        if (examples.length) {
          lines.push("### Examples");
          lines.push(...examples.map(renderTag));
        }
        lines.push(...renderProperties(file, child.children));
      }
    }

    const output = lines.flat(100).join("\n");
    await fs.writeFile(`../../www/docs/constructs/v1/${file.name}.md`, output);
  }
}

/**
 * @param tag {JSONOutput.CommentTag}
 */
function renderTag(tag) {
  return tag.text;
}

/**
 * @param file {JSONOutput.DeclarationReflection}
 * @param prefix {string}
 * @param parameter {JSONOutput.ParameterReflection["type"]}
 *
 * @returns {string}
 */
function renderType(file, prefix, parameter) {
  if (!parameter) throw new Error("No parameter");
  if (!parameter.type) throw new Error(`No type for ${parameter}`);
  if (parameter.type === "array")
    return "Array< " + renderType(file, prefix, parameter.elementType) + " >"
  if (parameter.type === "intrinsic") return `\`${parameter.name}\``;
  if (parameter.type === "literal") return `\`"${parameter.value}"\``;
  if (parameter.type === "template-literal") {
    const joined = [
      parameter.head,
      ...parameter.tail.map((x) => `$\{${x[0].name}\}${x[1]}`),
    ].join("");
    return `\`${joined}\``;
  }
  if (parameter.type === "reflection" && parameter.declaration && parameter.declaration.signatures) {
    const sig = parameter.declaration.signatures[0]
    if (sig.kind === ReflectionKind.CallSignature) {
      return `${sig.parameters.map(p => renderType(file, prefix, p.type)).join(", ")} => ${renderType(file, prefix, sig.type)}`
    }
  }
  if (parameter.type === "reflection" && prefix) {
    return (
      "\n" +
      renderProperties(file, parameter.declaration?.children, prefix).join("\n")
    );
  }
  if (parameter.type === "union") {
    return parameter.types
      .map((t) => renderType(file, prefix, t))
      .filter((x) => x)
      .join("&nbsp; | &nbsp;");
  }
  if (parameter.type === "reference") {
    if (parameter.package === "typescript")
      return `${parameter.name}<${parameter.typeArguments
        .map((x) => renderType(file, prefix, x))
        .join(", ")}>`;
    
    if (parameter.package) {
      if (parameter.package === "constructs")
        return `[\`${parameter.name}\`](https://docs.aws.amazon.com/cdk/api/v2/docs/constructs.${parameter.name}.html)`;
      if (parameter.package === "aws-cdk-lib")
        return `[\`${parameter.name}\`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.${parameter.name}.html)`;
      if (parameter.package.startsWith("@aws-cdk")) {
        const [_, pkg] = parameter.package.split("/");
        return `[\`${parameter.name}\`](https://docs.aws.amazon.com/cdk/api/v2/docs/@aws-cdk_${pkg}.${parameter.name}.html)`;
      }
    }
    const id = parameter.id;
    const ref = file.children?.find((c) => c.id === id);
    if (ref?.kindString === "Type alias")
      return renderType(file, prefix, ref.type);
    const link = ref ? `#${parameter.name.toLowerCase()}` : parameter.name.startsWith("Function") ? "Function" : parameter.name;
    return `[\`${parameter.name}\`](${link})`;
  }
  return "";
}

/**
 * @param file {JSONOutput.DeclarationReflection}
 * @param properties {JSONOutput.DeclarationReflection[]}
 * @param prefix {string}
 * @param onlyPublic {boolean}
 *
 * @returns {string}
 */
function renderProperties(file, properties, prefix, onlyPublic) {
  const filtered =
    properties?.filter(
      (c) =>
        (!c.name.startsWith("_")) &&
        (c.kindString === "Property" || c.kindString === "Accessor") &&
        !c.flags.isExternal &&
        (!onlyPublic || c.flags.isPublic) &&
        !c.comment?.tags?.find((x) => x.tag === "internal")
    ) || [];
  const lines = [];
  for (const property of filtered.sort((a, b) => {
    if (a.name.startsWith("cdk")) return 1
    if (b.name.startsWith("cdk")) return -1
    return a.name.localeCompare(b.name)
  })) {
    const signature = property.getSignature?.[0] || property;
    const nextPrefix = [prefix, property.name].filter((x) => x).join(".");
    if (signature.type?.type !== "reflection")
      lines.push(`### ${nextPrefix}${signature.flags.isOptional ? "?" : ""}\n`);
    lines.push(
      (signature.type?.type === "reflection" ? "" : "_Type_ : ") +
        renderType(file, nextPrefix, signature.type) +
        "\n"
    );
    if (signature.comment) {
      const def = signature.comment.tags?.find((x) => x.tag === "default");
      if (def) lines.push(`_Default_ : \`${def.text}\`\n`);
      lines.push(signature.comment.shortText);
      lines.push(signature.comment.text);
      const tags = signature.comment.tags || [];
      const examples = tags.filter((x) => x.tag === "example");
      if (examples.length) {
        lines.push("#### Examples");
        lines.push(
          ...examples
          .map(renderTag)
          .map(x => x.replace(/new .+\(/g, `new ${file.name}(`))
        );
      }
      lines.push(
        ...tags
          .filter((x) => x.tag !== "example" && x.tag !== "default")
          .map(renderTag)
      );
    }
  }
  return lines;
}
