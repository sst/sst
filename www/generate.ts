import * as path from "path";
import * as fs from "fs";
import * as TypeDoc from "typedoc";

import config from "./config";

type CliCommand = {
  name: string;
  hidden: boolean;
  description: { short: string; long?: string };
  args: {
    name: string;
    description: { short: string; long?: string };
    required: boolean;
  }[];
  flags: {
    name: string;
    description: { short: string; long?: string };
    type: "string" | "bool";
  }[];
  examples: {
    content: string;
  }[];
  children: CliCommand[];
};

const cmd = process.argv[2];

try {
  await configureLogger();
  await patchCode();
  if (!cmd || cmd === "components") await generateComponentsDoc();
  if (!cmd || cmd === "cli") await generateCliDoc();
  if (!cmd || cmd === "examples") await generateExamplesDocs();
} finally {
  await restoreCode();
}

function generateCliDoc() {
  const content = fs.readFileSync("cli-doc.json");
  const json = JSON.parse(content.toString()) as CliCommand;
  const outputFilePath = `src/content/docs/docs/reference/cli.mdx`;

  fs.writeFileSync(
    outputFilePath,
    [
      renderHeader("CLI", "Reference doc for the `sst` CLI."),
      renderSourceMessage("cmd/sst/main.go"),
      renderImports(outputFilePath),
      renderCliAbout(),
      renderCliGlobalFlags(),
      renderCliCommands(),
      renderFooter(),
    ]
      .flat()
      .join("\n")
  );

  function renderCliAbout() {
    console.debug(` - about`);
    const lines = [];

    lines.push(
      ``,
      `<Section type="about">`,
      renderCliDescription(json.description),
      `</Section>`,
      ``,
      `---`
    );
    return lines;
  }

  function renderCliGlobalFlags() {
    const lines: string[] = [];
    if (!json.flags.length) return lines;

    lines.push(``, `## Global Flags`);

    for (const f of json.flags) {
      console.debug(` - global flag ${f.name}`);
      lines.push(
        ``,
        `### ${f.name}`,
        `<Segment>`,
        `<Section type="parameters">`,
        `<InlineSection>`,
        `**Type** ${renderCliFlagType(f.type)}`,
        `</InlineSection>`,
        `</Section>`,
        renderCliDescription(f.description),
        `</Segment>`
      );
    }
    return lines;
  }

  function renderCliCommands() {
    const lines: string[] = [];
    if (!json.children.length) return lines;

    lines.push(``, `## Commands`);

    for (const cmd of json.children.filter((cmd) => !cmd.hidden)) {
      console.debug(` - command ${cmd.name}`);
      lines.push(``, `### ${cmd.name}`, `<Segment>`);

      // usage
      if (!cmd.children.length) {
        lines.push(
          `<Section type="signature">`,
          '```sh frame="none"',
          `sst ${renderCliCommandUsage(cmd)}`,
          "```",
          `</Section>`
        );
      }

      // args
      if (cmd.args.length) {
        lines.push(
          ``,
          `<Section type="parameters">`,
          `#### Args`,
          ...cmd.args.flatMap((a) => [
            `- <p><code class="key">${renderCliArgName(a)}</code></p>`,
            renderCliDescription(a.description),
          ]),
          `</Section>`
        );
      }

      // flags
      if (cmd.flags.length) {
        lines.push(
          ``,
          `<Section type="parameters">`,
          `#### Flags`,
          ...cmd.flags.flatMap((f) => [
            `- <p><code class="key">${f.name}</code> ${renderCliFlagType(
              f.type
            )}</p>`,
            renderCliDescription(f.description),
          ]),
          `</Section>`
        );
      }

      // subcommands
      if (cmd.children.length) {
        lines.push(
          ``,
          `<Section type="parameters">`,
          `#### Subcommands`,
          ...cmd.children
            .filter((s) => !s.hidden)
            .flatMap((s) => [
              `- <p>[<code class="key">${s.name}</code>](#${cmd.name}-${s.name})</p>`,
            ]),
          `</Section>`
        );
      }

      // description
      lines.push(renderCliDescription(cmd.description), `</Segment>`);

      // subcommands details
      cmd.children
        .filter((subcmd) => !subcmd.hidden)
        .flatMap((subcmd) => {
          lines.push(
            `<NestedTitle id="${cmd.name}-${subcmd.name}" Tag="h4" parent="${cmd.name} ">${subcmd.name}</NestedTitle>`,
            `<Segment>`
          );

          // usage
          lines.push(
            `<Section type="signature">`,
            '```sh frame="none"',
            `sst ${cmd.name} ${renderCliCommandUsage(subcmd)}`,
            "```",
            `</Section>`
          );

          // subcommand args
          if (subcmd.args.length) {
            lines.push(
              `<Section type="parameters">`,
              `#### Args`,
              ...subcmd.args.flatMap((a) => [
                `- <p><code class="key">${a.name}</code></p>`,
                renderCliDescription(a.description),
              ]),
              `</Section>`
            );
          }

          // subcommand flags
          if (subcmd.flags.length) {
            lines.push(
              `<Section type="parameters">`,
              `#### Flags`,
              ...subcmd.flags.flatMap((f) => [
                `- <p><code class="key">${f.name}</code></p>`,
                renderCliDescription(f.description),
              ]),
              `</Section>`
            );
          }

          // subcommands description
          lines.push(renderCliDescription(subcmd.description), `</Segment>`);
        });
    }
    return lines;
  }

  function renderCliDescription(description: CliCommand["description"]) {
    return description.long ?? description.short;
  }

  function renderCliArgName(prop: CliCommand["args"][number]) {
    return `${prop.name}${prop.required ? "" : "?"}`;
  }

  function renderCliCommandUsage(command: CliCommand) {
    const parts: string[] = [];

    parts.push(command.name);
    command.args.forEach((arg) =>
      arg.required ? parts.push(`<${arg.name}>`) : parts.push(`[${arg.name}]`)
    );
    return parts.join(" ");
  }

  function renderCliFlagType(type: CliCommand["flags"][number]["type"]) {
    return `<code class="primitive">${
      type === "bool" ? "boolean" : type
    }</code>`;
  }
}

async function generateExamplesDocs() {
  const modules = await buildExamples();
  const outputFilePath = `src/content/docs/docs/examples.mdx`;
  fs.writeFileSync(
    outputFilePath,
    [
      renderHeader("Examples", "A collection of example apps for reference."),
      renderSourceMessage("examples/"),
      renderExampleImports(outputFilePath),
      ...modules.map((module) => {
        console.info(`Generating example ${module.name.split("/")[0]}...`);
        return [
          ``,
          `---`,
          renderTdComment(module.children![0].comment?.summary!),
          ...renderRunFunction(module),
          ``,
          `View the [full example](${config.github}/tree/dev/examples/${
            module.name.split("/")[0]
          }).`,
          ``,
        ];
      }),
    ]
      .flat()
      .join("\n")
  );

  function renderRunFunction(module: TypeDoc.DeclarationReflection) {
    const lines = fs
      .readFileSync(path.join(`../examples`, module.sources![0].fileName))
      .toString()
      .split("\n");
    const start = lines.indexOf("  async run() {");
    const end = lines.lastIndexOf("  },");
    return [
      '```ts title="sst.config.ts"',
      ...lines.slice(start + 1, end).map((l) => l.substring(4)),
      "```",
    ];
  }
}

async function generateComponentsDoc() {
  const project = await buildComponents();
  const modules = project.children!.filter(
    (c) => c.kind === TypeDoc.ReflectionKind.Module
  );

  for (const module of modules) {
    console.info(`Generating ${module.name}...`);
    const sourceFile = module.sources![0].fileName;
    let outputFilePath: string;
    let outputFileContent: string[][];
    const linkHashes = new Map<TypeDoc.DeclarationReflection, string>();

    // Render global config file
    if (sourceFile === "pkg/platform/src/global-config.d.ts") {
      outputFilePath = `src/content/docs/docs/reference/global.mdx`;
      outputFileContent = [
        renderHeader("Global", "Reference doc for the Global `$` library."),
        renderSourceMessage("pkg/platform/src/global.d.ts"),
        renderImports(outputFilePath),
        renderAbout(),
        renderVariables(),
        renderFunctions(),
        renderFooter(),
      ];
    }
    // Render config file
    else if (sourceFile === "pkg/platform/src/config.ts") {
      outputFilePath = `src/content/docs/docs/reference/config.mdx`;
      outputFileContent = [
        renderHeader("Config", "Reference doc for the `sst.config.ts`."),
        renderSourceMessage(sourceFile),
        renderImports(outputFilePath),
        renderAbout(),
        renderInterfaces(),
        renderFooter(),
      ];
    }
    // Render DNS adapters
    else if (sourceFile.endsWith("/dns.ts")) {
      const dnsProvider = module.name.split("/")[1];
      const title =
        {
          aws: "AWS",
          cloudflare: "Cloudflare",
          vercel: "Vercel",
        }[dnsProvider] || dnsProvider;
      outputFilePath = `src/content/docs/docs/component/${dnsProvider}/dns.mdx`;
      outputFileContent = [
        renderHeader(
          `${title} DNS Adapter`,
          `Reference doc for the \`sst.${dnsProvider}.dns\` adapter.`
        ),
        renderSourceMessage(sourceFile),
        renderImports(outputFilePath),
        renderAbout(),
        renderFunctions(),
        renderInterfaces(),
        renderFooter(),
      ];
    }
    // Render components
    else {
      // Remove leading `components/`
      // module.name = "components/aws/bucket"
      // module.name = "components/secret"
      outputFilePath = path.join(
        "src/content/docs/docs/component",
        `${module.name.split("/").slice(1).join("/")}.mdx`
      );
      outputFileContent = [
        renderHeader(
          useClassName(),
          `Reference doc for the \`${useClassProviderNamespace()}.${useClassName()}\` component.`
        ),
        renderSourceMessage(sourceFile),
        renderImports(outputFilePath),
        renderAbout(),
        renderConstructor(),
        renderMethods(),
        renderProperties(),
        renderLinks(),
        renderInterfaces(),
        renderFooter(),
      ];
    }

    fs.writeFileSync(outputFilePath, outputFileContent.flat().join("\n"));

    function renderVariables() {
      const lines: string[] = [];
      const vars = (module.children ?? []).filter(
        (c) =>
          c.kind === TypeDoc.ReflectionKind.Variable &&
          !c.comment?.modifierTags.has("@internal")
      );

      if (!vars.length) return lines;

      // $app's type is Simplify<$APP>, and there's no way to get the flattened type
      // in TypeDoc. So we'll replace $app's type with the $APP interface.
      const type$app = vars.find((v) => v.name === "$app");
      const interface$app = useInterfaces().find((i) => i.name === "$APP");
      if (type$app && interface$app) {
        // @ts-expect-error
        type$app.type = {
          type: "reflection",
          declaration: interface$app,
        };
      }

      lines.push(``, `## Variables`);

      for (const v of vars) {
        console.debug(` - variable ${v.name}`);
        lines.push(
          ``,
          `### ${renderName(v)}`,
          `<Segment>`,
          `<Section type="parameters">`,
          `<InlineSection>`,
          `**Type** ${renderType(v.type!)}`,
          `</InlineSection>`,
          ...renderNestedTypeList(v),
          `</Section>`,
          ...renderDescription(v),
          ...renderExamples(v),
          `</Segment>`,
          // nested props (ie. `.nodes`)
          ...useNestedTypes(v.type!, v.name).flatMap(
            ({ depth, prefix, subType }) => [
              `<NestedTitle id="${linkHashes.get(subType)}" Tag="${
                depth === 0 ? "h4" : "h5"
              }" parent="${prefix}.">${renderName(subType)}</NestedTitle>`,
              `<Segment>`,
              `<Section type="parameters">`,
              `<InlineSection>`,
              `**Type** ${renderType(subType.type!)}`,
              `</InlineSection>`,
              `</Section>`,
              ...renderDescription(subType),
              `</Segment>`,
            ]
          )
        );
      }
      return lines;
    }

    function renderFunctions() {
      const lines: string[] = [];
      const fns = (module.children ?? []).filter(
        (f) =>
          f.kind === TypeDoc.ReflectionKind.Function &&
          !f.signatures![0].comment?.modifierTags.has("@internal")
      );

      if (!fns.length) return lines;

      lines.push(``, `## Functions`);

      for (const f of fns) {
        console.debug(` - function ${f.name}`);
        lines.push(``, `### ${renderName(f)}`, `<Segment>`);

        // signature
        lines.push(
          `<Section type="signature">`,
          "```ts",
          renderSignature(f.signatures![0]),
          "```",
          `</Section>`
        );

        // parameters
        if (f.signatures![0].parameters?.length) {
          lines.push(
            ``,
            `<Section type="parameters">`,
            `#### Parameters`,
            ...f.signatures![0].parameters.flatMap((param) => {
              let type;
              // HACK: special handle for $jsonParse's reviver param b/c
              //       it's a function type.
              if (f.name === "$jsonParse" && param.name === "reviver") {
                type = renderJsonParseReviverType();
              } else if (
                f.name === "$jsonStringify" &&
                param.name === "replacer"
              ) {
                type = renderJsonStringifyReplacerType();
              } else if (f.name === "$transform" && param.name === "resource") {
                type = renderTransformResourceType();
              } else if (f.name === "$transform" && param.name === "cb") {
                type = renderTransformCallbackType();
              } else {
                type = renderType(param.type!);
              }

              return [
                `- <p><code class="key">${renderSignatureArg(
                  param
                )}</code> ${type}</p>`,
                ...renderDescription(param),
              ];
            }),
            `</Section>`
          );
        }

        lines.push(
          ...renderReturnValue(f.signatures![0]),
          ...renderDescription(f.signatures![0]),
          ``,
          ...renderExamples(f.signatures![0]),
          `</Segment>`
        );
      }
      return lines;
    }

    function renderAbout() {
      console.debug(` - about`);
      const lines = [];
      const comment = isRenderingComponent()
        ? useClassComment()
        : useModuleComment();

      lines.push(``, `<Section type="about">`);

      // description
      lines.push(renderTdComment(comment.summary));

      // examples
      const examples = comment.blockTags.filter(
        (tag) => tag.tag === "@example"
      );
      if (examples.length) {
        lines.push(
          ``,
          ...examples.map((example) => renderTdComment(example.content))
        );
      }

      lines.push(`</Section>`, ``, `---`);
      return lines;
    }

    function renderConstructor() {
      console.debug(` - constructor`);
      const lines = [];
      const signature = useClassConstructor().signatures![0];

      lines.push(``, `## Constructor`, ``, `<Segment>`);

      // signature
      lines.push(
        `<Section type="signature">`,
        "```ts",
        renderSignature(signature),
        "```",
        `</Section>`
      );

      // parameters
      if (signature.parameters?.length) {
        lines.push(
          ``,
          `<Section type="parameters">`,
          `#### Parameters`,
          ...signature.parameters.flatMap((param) => [
            `- <p><code class="key">${renderSignatureArg(
              param
            )}</code> ${renderType(param.type!)}</p>`,
            ...renderDescription(param),
          ]),
          `</Section>`
        );
      }

      lines.push(`</Segment>`);
      return lines;
    }

    function renderMethods() {
      const lines: string[] = [];
      const methods = useClassMethods();
      if (!methods?.length) return lines;

      lines.push(``, `## Methods`);

      for (const m of methods) {
        lines.push(
          ``,
          `### ${m.flags.isStatic ? "static " : ""}${m.name}`,
          `<Segment>`,
          `<Section type="signature">`,
          "```ts",
          (m.flags.isStatic ? `${useClassName()}.` : "") +
            renderSignature(m.signatures![0]),
          "```",
          `</Section>`
        );

        // parameters
        if (m.signatures![0].parameters?.length) {
          lines.push(
            ``,
            `<Section type="parameters">`,
            `#### Parameters`,
            ...m.signatures![0].parameters.flatMap((param) => [
              `- <p><code class="key">${renderSignatureArg(
                param
              )}</code> ${renderType(param.type!)}</p>`,
              ...renderDescription(param),
            ]),
            `</Section>`
          );
        }

        lines.push(
          ...renderReturnValue(m.signatures![0]),
          ...renderDescription(m.signatures![0]),
          ``,
          ...renderExamples(m.signatures![0]),
          `</Segment>`
        );
      }
      return lines;
    }

    function renderProperties() {
      const lines: string[] = [];
      const getters = useClassGetters();
      if (!getters.length) return lines;

      lines.push(``, `## Properties`);

      for (const g of getters) {
        console.debug(` - property ${g.name}`);
        lines.push(
          ``,
          `### ${renderName(g)}`,
          `<Segment>`,
          `<Section type="parameters">`,
          `<InlineSection>`,
          `**Type** ${renderType(g.getSignature!.type!)}`,
          `</InlineSection>`,
          ...renderNestedTypeList(g.getSignature!),
          `</Section>`,
          ...renderDescription(g.getSignature!),
          `</Segment>`,
          // nested props (ie. `.nodes`)
          ...useNestedTypes(g.getSignature!.type!, g.name).flatMap(
            ({ depth, prefix, subType }) => [
              `<NestedTitle id="${linkHashes.get(subType)}" Tag="${
                depth === 0 ? "h4" : "h5"
              }" parent="${prefix}.">${renderName(subType)}</NestedTitle>`,
              `<Segment>`,
              `<Section type="parameters">`,
              `<InlineSection>`,
              `**Type** ${
                subType.kind === TypeDoc.ReflectionKind.Property
                  ? renderType(subType.type!)
                  : renderType(subType.getSignature!.type!)
              }`,
              `</InlineSection>`,
              `</Section>`,
              ...(subType.kind === TypeDoc.ReflectionKind.Property
                ? renderDescription(subType)
                : renderDescription(subType.getSignature!)),
              `</Segment>`,
            ]
          )
        );
      }
      return lines;
    }

    function renderLinks() {
      const lines: string[] = [];
      const method = useClassGetSSTLinkMethod();
      if (!method) return lines;

      lines.push(``, `## Links`);
      lines.push(
        ``,
        `The following are accessible through the [SDK](/docs/reference/sdk/) at runtime.`
      );

      // Validate getSSTLink() return type
      const returnType = method.signatures![0].type as TypeDoc.ReflectionType;
      if (
        returnType.declaration.children?.length !== 1 ||
        returnType.declaration.children?.[0].name !== "properties"
      ) {
        throw new Error(
          "Failed to render links b/c getSSTLink() return value does not match { properties }"
        );
      }
      const propertiesType = returnType.declaration.children[0]
        .type as TypeDoc.ReflectionType;
      if (!propertiesType.declaration.children?.length) {
        throw new Error(
          "Failed to render links b/c getSSTLink() returned 0 link values"
        );
      }

      for (const link of propertiesType.declaration.children) {
        console.debug(` - link ${link.name}`);

        let linkType: TypeDoc.SomeType | undefined;

        // Convert Output<T> => T
        if (
          link.type &&
          link.type.type === "reference" &&
          link.type.name === "Output" &&
          (link.type.typeArguments![0].type === "intrinsic" ||
            link.type.typeArguments![0].type === "union")
        ) {
          linkType = link.type.typeArguments![0];
        }
        // Convert Output<T> | undefined => T | undefined
        else if (link.type && link.type.type === "union") {
          linkType = link.type;
          linkType.types = linkType.types.map((t) =>
            t.type === "reference" && t.name === "Output"
              ? t.typeArguments![0]
              : t
          );
        }

        if (!linkType) {
          // @ts-expect-error
          delete link.type._project;
          console.error(link.type);
          throw new Error(
            `Failed to render link ${link.name} b/c link value does not match type \`Output<intrinsic>\`, \`Output<intrinsic | undefined>\`, or \`Output<intrinsic> | undefined\``
          );
        }

        // Find the getter property that matches the link name
        const getter = useClassGetters().find((g) => g.name === link.name);
        if (!getter)
          throw new Error(
            `Failed to render link ${link.name} b/c cannot find a getter property with the matching name`
          );

        lines.push(
          ``,
          `### ${renderName(link)}`,
          `<Segment>`,
          `<Section type="parameters">`,
          `<InlineSection>`,
          `**Type** ${renderType(linkType)}`,
          `</InlineSection>`,
          `</Section>`,
          ...renderDescription(getter.getSignature!),
          `</Segment>`
        );
      }
      return lines;
    }

    function renderInterfaces() {
      const lines: string[] = [];
      const interfaces = useInterfaces().filter(
        (c) => !c.comment?.modifierTags.has("@internal")
      );

      for (const int of interfaces) {
        console.debug(` - interface ${int.name}`);
        // interface name
        lines.push(``, `## ${int.name}`);

        // description
        if (int.comment?.summary) {
          lines.push(``, renderTdComment(int.comment?.summary!));
        }

        // props
        for (const prop of useInterfaceProps(int)) {
          if (prop.kind === TypeDoc.ReflectionKind.Property) {
            console.debug(`   - interface prop ${prop.name}`);
            lines.push(
              `### ${renderName(prop)}`,
              `<Segment>`,
              `<Section type="parameters">`,
              `<InlineSection>`,
              `**Type** ${renderType(prop.type!)}`,
              `</InlineSection>`,
              ...renderNestedTypeList(prop),
              `</Section>`,
              ...renderDefaultTag(prop),
              ...renderDescription(prop),
              ``,
              ...renderExamples(prop),
              `</Segment>`,
              // nested props (ie. `.domain`, `.transform`)
              ...useNestedTypes(prop.type!, prop.name).flatMap(
                ({ depth, prefix, subType }) => [
                  `<NestedTitle id="${linkHashes.get(subType)}" Tag="${
                    depth === 0 ? "h4" : "h5"
                  }" parent="${prefix}.">${renderName(subType)}</NestedTitle>`,
                  `<Segment>`,
                  `<Section type="parameters">`,
                  `<InlineSection>`,
                  `**Type** ${renderType(subType.type!)}`,
                  `</InlineSection>`,
                  `</Section>`,
                  ...renderDefaultTag(subType),
                  ...renderDescription(subType),
                  ``,
                  ...renderExamples(subType),
                  `</Segment>`,
                ]
              )
            );
          } else if (prop.kind === TypeDoc.ReflectionKind.Method) {
            console.debug(`   - interface method ${prop.name}`);
            lines.push(
              `### ${renderName(prop)}`,
              `<Segment>`,
              `<Section type="signature">`,
              "```ts",
              renderSignature(prop.signatures![0]),
              "```",
              `</Section>`
            );

            // parameters
            if (prop.signatures![0].parameters?.length) {
              lines.push(
                ``,
                `<Section type="parameters">`,
                `#### Parameters`,
                ...prop.signatures![0].parameters.flatMap((param) => [
                  `- <p><code class="key">${renderSignatureArg(
                    param
                  )}</code> ${renderType(param.type!)}</p>`,
                  ...renderDescription(param),
                ]),
                `</Section>`
              );
            }

            lines.push(
              ...renderReturnValue(prop.signatures![0]),
              ...renderDescription(prop.signatures![0]),
              ``,
              ...renderExamples(prop.signatures![0]),
              `</Segment>`
            );
          }
        }
      }

      return lines;
    }

    function renderName(prop: TypeDoc.DeclarationReflection) {
      return `${prop.name}${prop.flags.isOptional ? "?" : ""}`;
    }

    function renderSignatureArg(prop: TypeDoc.ParameterReflection) {
      if (prop.defaultValue && prop.defaultValue !== "{}")
        throw new Error(
          [
            `Unsupported default value "${prop.defaultValue}" for name "${prop.name}".`,
            ``,
            `Function signature parameters can be defined as optional in one of two ways:`,
            ` - flag.isOptional is set, ie. "(args?: FooArgs)"`,
            ` - defaultValue is set, ie. "(args: FooArgs = {})`,
            ``,
            `But in this case, the default value is not "{}". Hence not supported.`,
          ].join("\n")
        );

      return `${prop.name}${
        prop.flags.isOptional || prop.defaultValue ? "?" : ""
      }`;
    }

    function renderDescription(
      prop:
        | TypeDoc.DeclarationReflection
        | TypeDoc.ParameterReflection
        | TypeDoc.SignatureReflection
    ) {
      if (!prop.comment?.summary) return [];
      return [renderTdComment(prop.comment?.summary)];
    }

    function renderDefaultTag(prop: TypeDoc.DeclarationReflection) {
      const defaultTag = prop.comment?.blockTags.find(
        (tag) => tag.tag === "@default"
      );
      if (!defaultTag) return [];
      return [
        ``,
        `<InlineSection>`,
        // If default tag is just a value, render it as a type ie. false
        // Otherwise render it as a comment ie. No domains configured
        defaultTag.content.length === 1 && defaultTag.content[0].kind === "code"
          ? `**Default** ${renderType({
              type: "intrinsic",
              name: defaultTag.content[0].text.replace(/`/g, ""),
            } as TypeDoc.SomeType)}`
          : `**Default** ${renderTdComment(defaultTag.content)}`,
        `</InlineSection>`,
      ];
    }

    function renderReturnValue(prop: TypeDoc.SignatureReflection) {
      return [
        ``,
        `<InlineSection>`,
        `**Returns** ${renderType(prop.type!)}`,
        `</InlineSection>`,
      ];
    }

    function renderNestedTypeList(
      prop: TypeDoc.DeclarationReflection | TypeDoc.SignatureReflection
    ) {
      return useNestedTypes(prop.type!, prop.name).map(
        ({ depth, prefix, subType }) => {
          const hasChildren =
            subType.kind === TypeDoc.ReflectionKind.Property
              ? useNestedTypes(subType.type!).length
              : useNestedTypes(subType.getSignature?.type!).length;
          const type = hasChildren ? ` ${renderType(subType.type!)}` : "";
          const generateHash = (counter = 0): string => {
            const hash = `${prefix}.${subType.name}`
              .toLowerCase()
              .replace(/[^a-z0-9\.]/g, "")
              .replace(/\./g, "-");
            +(counter > 0 ? `-${counter}` : "");
            return Array.from(linkHashes.values()).includes(hash)
              ? generateHash(counter + 1)
              : hash;
          };
          const hash = generateHash();
          linkHashes.set(subType, hash);
          return `${" ".repeat(depth * 2)}- <p>[<code class="key">${renderName(
            subType
          )}</code>](#${hash})${type}</p>`;
        }
      );
    }

    function renderExamples(
      prop: TypeDoc.DeclarationReflection | TypeDoc.SignatureReflection
    ) {
      return (prop.comment?.blockTags ?? [])
        .filter((tag) => tag.tag === "@example")
        .flatMap((tag) => renderTdComment(tag.content));
    }

    function renderSignature(signature: TypeDoc.SignatureReflection) {
      const parameters = (signature.parameters ?? [])
        .map(renderSignatureArg)
        .join(", ");
      return `${signature.name}(${parameters})`;
    }

    function renderType(type: TypeDoc.SomeType): string {
      if (type.type === "intrinsic") return renderIntrisicType(type);
      if (type.type === "literal") return renderLiteralType(type);
      if (type.type === "templateLiteral")
        return renderTemplateLiteralType(type);
      if (type.type === "union") return renderUnionType(type);
      if (type.type === "array") return renderArrayType(type);
      if (type.type === "reference" && type.package === "typescript")
        return renderTypescriptType(type);
      if (type.type === "reference" && type.package === "@sst/platform")
        return renderSstType(type);
      if (type.type === "reference" && type.package === "@pulumi/pulumi")
        return renderPulumiType(type);
      if (type.type === "reference" && type.package?.startsWith("@pulumi/"))
        return renderPulumiProviderType(type);
      if (type.type === "reference" && type.package === "@pulumiverse/vercel")
        return renderVercelType(type);
      if (type.type === "reference" && type.package === "esbuild")
        return renderEsbuildType(type);
      if (type.type === "reflection" && type.declaration.children?.length)
        return renderObjectType(type);

      // @ts-expect-error
      delete type._project;
      console.log(type);
      throw new Error(`Unsupported type "${type.type}"`);
    }
    function renderIntrisicType(type: TypeDoc.IntrinsicType) {
      return `<code class="primitive">${type.name}</code>`;
    }
    function renderLiteralType(type: TypeDoc.LiteralType) {
      // Intrisic values: don't print in quotes
      // ie.
      // {
      //   "type": "literal",
      //   "value": false
      // }
      if (type.value === true || type.value === false) {
        return `<code class="primitive">${type.value}</code>`;
      }
      // String value
      // ie.
      // {
      //   "type": "literal",
      //   "value": "arm64"
      // }
      const santized =
        typeof type.value === "string"
          ? type.value!.replace(/([*:])/g, "\\$1")
          : type.value;
      return `<code class="symbol">&ldquo;</code><code class="primitive">${santized}</code><code class="symbol">&rdquo;</code>`;
    }
    function renderTemplateLiteralType(type: TypeDoc.TemplateLiteralType) {
      // ie. memory: `${number} MB`
      // {
      //   "type": "templateLiteral",
      //   "head": "",
      //   "tail": [
      //     [
      //       {
      //         "type": "intrinsic",
      //         "name": "number"
      //       },
      //       " MB"
      //     ]
      //   ]
      // },
      if (
        typeof type.head !== "string" ||
        type.tail.length !== 1 ||
        type.tail[0].length !== 2 ||
        type.tail[0][0].type !== "intrinsic" ||
        typeof type.tail[0][1] !== "string"
      ) {
        console.error(type);
        throw new Error(`Unsupported templateLiteral type`);
      }
      return `<code class="symbol">&ldquo;</code><code class="primitive">${type.head}$\\{${type.tail[0][0].name}\\}${type.tail[0][1]}</code><code class="symbol">&rdquo;</code>`;
    }
    function renderUnionType(type: TypeDoc.UnionType) {
      return type.types
        .map((t) => renderType(t))
        .join(`<code class="symbol"> | </code>`);
    }
    function renderArrayType(type: TypeDoc.ArrayType) {
      return type.elementType.type === "union"
        ? `<code class="symbol">(</code>${renderType(
            type.elementType
          )}<code class="symbol">)[]</code>`
        : `${renderType(type.elementType)}<code class="symbol">[]</code>`;
    }
    function renderTypescriptType(type: TypeDoc.ReferenceType) {
      // ie. Record<string, string>
      return [
        `<code class="primitive">${type.name}</code>`,
        `<code class="symbol">&lt;</code>`,
        type.typeArguments?.map((t) => renderType(t)).join(", "),
        `<code class="symbol">&gt;</code>`,
      ].join("");
    }
    function renderSstType(type: TypeDoc.ReferenceType) {
      if (type.name === "Transform") {
        const renderedType = renderType(type.typeArguments?.[0]!);
        return [
          renderedType,
          `<code class="symbol"> | </code>`,
          `<code class="symbol">(</code>`,
          `<code class="primitive">args</code>`,
          `<code class="symbol">: </code>`,
          renderedType,
          `<code class="symbol"> => </code>`,
          `<code class="primitive">void</code>`,
          `<code class="symbol">)</code>`,
        ].join("");
      }
      if (type.name === "Input") {
        return [
          `<code class="primitive">${type.name}</code>`,
          `<code class="symbol">&lt;</code>`,
          renderType(type.typeArguments?.[0]!),
          `<code class="symbol">&gt;</code>`,
        ].join("");
      }
      const dnsProvider = {
        AwsDns: "aws",
        CloudflareDns: "cloudflare",
        VercelDns: "vercel",
      }[type.name];
      if (dnsProvider) {
        return `[<code class="type">sst.${dnsProvider}.dns</code>](/docs/component/${dnsProvider}/dns/)`;
      }
      // types in the same doc (links to the class ie. `subscribe()` return type)
      if (isRenderingComponent() && type.name === useClassName()) {
        return `[<code class="type">${type.name}</code>](.)`;
      }
      // types in the same doc (links to an interface)
      if (useInterfaces().find((i) => i.name === type.name)) {
        return `[<code class="type">${
          type.name
        }</code>](#${type.name.toLowerCase()})`;
      }
      // types in different doc
      const externalModule = {
        Bucket: "bucket",
        BucketArgs: "bucket",
        Cdn: "cdn",
        CdnArgs: "cdn",
        CognitoUserPoolClient: "cognito-user-pool-client",
        Function: "function",
        FunctionArgs: "function",
        FunctionPermissionArgs: "function",
        PostgresArgs: "postgres",
        Service: "service",
      }[type.name];
      if (externalModule) {
        const hash = type.name.endsWith("Args")
          ? `#${type.name.toLowerCase()}`
          : "";
        return `[<code class="type">${type.name}</code>](/docs/component/aws/${externalModule}/${hash})`;
      }

      // @ts-expect-error
      delete type._project;
      console.error(type);
      throw new Error(`Unsupported sst type`);
    }
    function renderPulumiType(type: TypeDoc.ReferenceType) {
      if (type.name === "T") {
        return `<code class="primitive">${type.name}</code>`;
      }
      if (type.name === "Output" || type.name === "Input") {
        return [
          `<code class="primitive">${type.name}</code>`,
          `<code class="symbol">&lt;</code>`,
          renderType(type.typeArguments?.[0]!),
          `<code class="symbol">&gt;</code>`,
        ].join("");
      }
      if (type.name === "UnwrappedObject" || type.name === "Unwrap") {
        return renderType(type.typeArguments?.[0]!);
      }
      if (type.name === "ComponentResourceOptions") {
        return `[<code class="type">${type.name}</code>](https://www.pulumi.com/docs/concepts/options/)`;
      }
      // Handle $util type in global.d.ts
      if (type.name === "__module") {
        return `[<code class="type">@pulumi/pulumi</code>](https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/pulumi/)`;
      }

      // @ts-expect-error
      delete type._project;
      console.error(type);
      throw new Error(`Unsupported @pulumi/pulumi type`);
    }
    function renderPulumiProviderType(type: TypeDoc.ReferenceType) {
      const ret = ((type as any)._target.fileName as string).match(
        "node_modules/@pulumi/([^/]+)/(.+).d.ts"
      )!;
      const provider = ret[1].toLocaleLowerCase(); // ie. aws
      const cls = ret[2].toLocaleLowerCase(); // ie. s3/Bucket
      if (cls === "types/input") {
        // Input types
        // ie. errorResponses?: aws.types.input.cloudfront.DistributionCustomErrorResponse[];
        //{
        //  type: 'reference',
        //  refersToTypeParameter: false,
        //  preferValues: false,
        //  name: 'DistributionCustomErrorResponse',
        //  _target: ReflectionSymbolId {
        //    fileName: '/Users/frank/Sites/ion/pkg/platform/node_modules/@pulumi/aws/types/input.d.ts',
        //    qualifiedName: 'cloudfront.DistributionCustomErrorResponse',
        //    pos: 427276,
        //    transientId: NaN
        //  },
        //  qualifiedName: 'cloudfront.DistributionCustomErrorResponse',
        //  package: '@pulumi/aws',
        //  typeArguments: undefined
        //}
        const link = {
          DistributionOrigin: "cloudfront/distribution",
          DistributionOriginGroup: "cloudfront/distribution",
          DistributionCustomErrorResponse: "cloudfront/distribution",
          DistributionDefaultCacheBehavior: "cloudfront/distribution",
          DistributionOrderedCacheBehavior: "cloudfront/distribution",
        }[type.name];
        if (!link) {
          // @ts-expect-error
          delete type._project;
          console.error(type);
          throw new Error(`Unsupported @pulumi provider input type`);
        }
        return `[<code class="type">${
          type.name
        }</code>](https://www.pulumi.com/registry/packages/${provider}/api-docs/${link}/#${type.name.toLowerCase()})`;
      } else if (cls.startsWith("types/")) {
        console.error(type);
        throw new Error(`Unsupported @pulumi provider class type`);
      } else {
        // Resource types
        // ie. bucket?: aws.s3.BucketV2;
        //{
        //  type: 'reference',
        //  refersToTypeParameter: false,
        //  preferValues: false,
        //  name: 'BucketV2',
        //  _target: ReflectionSymbolId {
        //    fileName: '/Users/frank/Sites/ion/pkg/platform/node_modules/@pulumi/aws/s3/bucketV2.d.ts',
        //    qualifiedName: 'BucketV2',
        //    pos: 127,
        //    transientId: NaN
        //  },
        //  qualifiedName: 'BucketV2',
        //  package: '@pulumi/aws',
        //  typeArguments: []
        //}
      }
      const hash = type.name.endsWith("Args") ? `#inputs` : "";
      return `[<code class="type">${type.name}</code>](https://www.pulumi.com/registry/packages/${provider}/api-docs/${cls}/${hash})`;
    }
    function renderVercelType(type: TypeDoc.ReferenceType) {
      const ret = ((type as any)._target.fileName as string).match(
        "node_modules/@pulumiverse/([^/]+)/(.+).d.ts"
      )!;
      const provider = ret[1].toLocaleLowerCase(); // ie. vercel
      const cls = ret[2].toLocaleLowerCase(); // ie. dnsRecord
      // Resource types
      //{
      //  type: 'reference',
      //  name: 'DnsRecord',
      //  _target: ReflectionSymbolId {
      //    fileName: '/Users/frank/Sites/ion/node_modules/@pulumiverse/vercel/dnsRecord.d.ts',
      //    qualifiedName: 'DnsRecord',
      //    pos: 125,
      //    transientId: NaN
      //  },
      //  qualifiedName: 'DnsRecord',
      //  package: '@pulumiverse/vercel',
      //}
      const hash = type.name.endsWith("Args") ? `#inputs` : "";
      return `[<code class="type">${type.name}</code>](https://www.pulumi.com/registry/packages/${provider}/api-docs/${cls}/${hash})`;
    }
    function renderEsbuildType(type: TypeDoc.ReferenceType) {
      const hash = type.name === "Loader" ? `#loader` : "#build";
      return `[<code class="type">${type.name}</code>](https://esbuild.github.io/api/${hash})`;
    }
    function renderJsonParseReviverType() {
      return `[<code class="type">JSON.parse reviver</code>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#reviver)`;
    }
    function renderJsonStringifyReplacerType() {
      return `[<code class="type">JSON.stringify replacer</code>](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#replacer)`;
    }
    function renderTransformResourceType() {
      return `<code class="type">Component Class</code>`;
    }
    function renderTransformCallbackType() {
      return `<code class="type">(args, opts) => void</code>`;
    }
    function renderObjectType(type: TypeDoc.ReflectionType) {
      return `<code class="primitive">Object</code>`;
    }

    function isRenderingComponent() {
      const sourceFile = module.sources![0].fileName;
      return (
        sourceFile !== "pkg/platform/src/config.ts" &&
        sourceFile !== "pkg/platform/src/global-config.d.ts" &&
        !sourceFile.endsWith("/dns.ts")
      );
    }

    function useModuleComment() {
      const comment = module.comment;
      if (!comment) throw new Error("Class comment not found");
      return comment;
    }

    function useClass() {
      const c = module.children?.find(
        (c) => c.kind === TypeDoc.ReflectionKind.Class
      );
      if (!c) throw new Error("Class not found");
      return c;
    }

    function useClassName() {
      return useClass().name;
    }

    function useClassProviderNamespace() {
      // "sources": [
      //   {
      //     "fileName": "pkg/platform/src/components/aws/astro.ts",
      //     "line": 280,
      //     "character": 13,
      //     "url": "https://github.com/sst/ion/blob/0776cea/pkg/platform/src/components/aws/astro.ts#L280"
      //   }
      // ],
      const fileName = useClass().sources![0].fileName;
      if (!fileName.startsWith("pkg/platform/src/components/"))
        throw new Error(
          `Fail to generate class namespace from class fileName ${fileName}. Expected to start with "pkg/platform/src/components/"`
        );

      const namespace = fileName.split("/").slice(-2, -1)[0];
      return namespace === "components" ? "sst" : `sst.${namespace}`;
    }

    function useClassComment() {
      const comment = useClass().comment;
      if (!comment) throw new Error("Class comment not found");
      return comment;
    }

    function useClassConstructor() {
      const constructor = useClass().children?.find(
        (c) => c.kind === TypeDoc.ReflectionKind.Constructor
      );
      if (!constructor) throw new Error("Constructor not found");
      return constructor;
    }

    function useClassMethods() {
      return useClass().children?.filter(
        (c) =>
          c.kind === TypeDoc.ReflectionKind.Method &&
          !c.flags.isExternal &&
          !c.flags.isPrivate &&
          c.signatures &&
          !c.signatures[0].comment?.modifierTags.has("@internal")
      );
    }

    function useClassGetSSTLinkMethod() {
      return useClass().children?.find(
        (c) =>
          c.kind === TypeDoc.ReflectionKind.Method &&
          !c.flags.isExternal &&
          c.signatures &&
          c.signatures[0].name === "getSSTLink"
      );
    }

    function useClassGetters() {
      return (useClass().children ?? []).filter(
        (c) => c.kind === TypeDoc.ReflectionKind.Accessor && c.flags.isPublic
      );
    }

    function useInterfaces() {
      return (module.children ?? []).filter(
        (c) => c.kind === TypeDoc.ReflectionKind.Interface
      );
    }

    function useInterfaceProps(i: TypeDoc.DeclarationReflection) {
      if (!i.children?.length)
        throw new Error(`Interface ${i.name} has no props`);

      return i.children.filter(
        (child) => !child.comment?.modifierTags.has("@internal")
      );
    }

    function useNestedTypes(
      type: TypeDoc.SomeType,
      prefix: string = "",
      depth: number = 0
    ): {
      subType: TypeDoc.DeclarationReflection;
      prefix: string;
      depth: number;
    }[] {
      if (type.type === "union")
        return type.types.flatMap((t) => useNestedTypes(t, prefix, depth));
      if (type.type === "array")
        return useNestedTypes(type.elementType, `${prefix}[]`, depth);
      if (type.type === "reference")
        return (type.typeArguments ?? []).flatMap((t) =>
          type.package === "typescript" && type.name === "Record"
            ? useNestedTypes(t, `${prefix}[]`, depth)
            : useNestedTypes(t, prefix, depth)
        );
      if (type.type === "reflection")
        return type.declaration.children!.flatMap((subType) => [
          { prefix, subType, depth },
          ...(subType.kind === TypeDoc.ReflectionKind.Property
            ? useNestedTypes(
                subType.type!,
                `${prefix}.${subType.name}`,
                depth + 1
              )
            : []),
          ...(subType.kind === TypeDoc.ReflectionKind.Accessor
            ? useNestedTypes(
                subType.getSignature?.type!,
                `${prefix}.${subType.name}`,
                depth + 1
              )
            : []),
        ]);

      return [];
    }
  }
}

async function buildComponents() {
  // Generate project reflection
  const app = await TypeDoc.Application.bootstrap({
    // Ignore type errors caused by patching `Input<>`.
    skipErrorChecking: true,
    // Disable parsing @default tags as ```ts block code.
    jsDocCompatibility: {
      defaultTag: false,
    },
    entryPoints: [
      "../pkg/platform/src/config.ts",
      "../pkg/platform/src/global-config.d.ts",
      "../pkg/platform/src/components/secret.ts",
      "../pkg/platform/src/components/aws/apigatewayv2.ts",
      "../pkg/platform/src/components/aws/bucket.ts",
      "../pkg/platform/src/components/aws/cluster.ts",
      "../pkg/platform/src/components/aws/cognito-identity-pool.ts",
      "../pkg/platform/src/components/aws/cognito-user-pool.ts",
      "../pkg/platform/src/components/aws/cognito-user-pool-client.ts",
      "../pkg/platform/src/components/aws/cron.ts",
      "../pkg/platform/src/components/aws/dynamo.ts",
      "../pkg/platform/src/components/aws/email.ts",
      "../pkg/platform/src/components/aws/function.ts",
      "../pkg/platform/src/components/aws/postgres.ts",
      "../pkg/platform/src/components/aws/vector.ts",
      "../pkg/platform/src/components/aws/astro.ts",
      "../pkg/platform/src/components/aws/nextjs.ts",
      "../pkg/platform/src/components/aws/remix.ts",
      "../pkg/platform/src/components/aws/queue.ts",
      "../pkg/platform/src/components/aws/router.ts",
      "../pkg/platform/src/components/aws/service.ts",
      "../pkg/platform/src/components/aws/sns-topic.ts",
      "../pkg/platform/src/components/aws/solid-start.ts",
      "../pkg/platform/src/components/aws/static-site.ts",
      "../pkg/platform/src/components/aws/vpc.ts",
      "../pkg/platform/src/components/cloudflare/worker.ts",
      "../pkg/platform/src/components/cloudflare/bucket.ts",
      "../pkg/platform/src/components/cloudflare/d1.ts",
      "../pkg/platform/src/components/cloudflare/kv.ts",
      // internal
      "../pkg/platform/src/components/aws/dns.ts",
      "../pkg/platform/src/components/cloudflare/dns.ts",
      "../pkg/platform/src/components/vercel/dns.ts",
      "../pkg/platform/src/components/aws/cdn.ts",
    ],
    tsconfig: "../pkg/platform/tsconfig.json",
  });

  const project = await app.convert();
  if (!project) throw new Error("Failed to convert project");

  // Generate JSON (generated for debugging purposes)
  await app.generateJson(project, "components-doc.json");

  return project;
}

async function buildExamples() {
  // Generate project reflection
  const app = await TypeDoc.Application.bootstrap({
    // Ignore type errors caused by patching `Input<>`.
    skipErrorChecking: true,
    // Disable parsing @default tags as ```ts block code.
    jsDocCompatibility: {
      defaultTag: false,
    },
    entryPoints: ["../examples/*/sst.config.ts"],
    tsconfig: "../examples/tsconfig.json",
  });

  const project = await app.convert();
  if (!project) throw new Error("Failed to convert project");

  // Generate JSON (generated for debugging purposes)
  await app.generateJson(project, "examples-doc.json");

  return project.children!.filter(
    (c) =>
      c.kind === TypeDoc.ReflectionKind.Module &&
      c.children?.length === 1 &&
      c.children[0].comment
  );
}

function renderHeader(title: string, description: string) {
  return [`---`, `title: ${title}`, `description: ${description}`, `---`];
}

function renderSourceMessage(source: string) {
  return [``, `{/* DO NOT EDIT. AUTO-GENERATED FROM "${source}" */}`];
}

function renderImports(outputFilePath: string) {
  const relativePath = path.relative(outputFilePath, "src");
  return [
    ``,
    `import Segment from '${relativePath}/src/components/tsdoc/Segment.astro';`,
    `import Section from '${relativePath}/src/components/tsdoc/Section.astro';`,
    `import NestedTitle from '${relativePath}/src/components/tsdoc/NestedTitle.astro';`,
    `import InlineSection from '${relativePath}/src/components/tsdoc/InlineSection.astro';`,
    "",
    '<div class="tsdoc">',
  ];
}

function renderExampleImports(outputFilePath: string) {
  const relativePath = path.relative(outputFilePath, "src");
  return [
    ``,
    `import Segment from '${relativePath}/src/components/tsdoc/Segment.astro';`,
    `import Section from '${relativePath}/src/components/tsdoc/Section.astro';`,
    `import NestedTitle from '${relativePath}/src/components/tsdoc/NestedTitle.astro';`,
    `import InlineSection from '${relativePath}/src/components/tsdoc/InlineSection.astro';`,
    "",
    `Below are a collection of example SST apps. These are available in the [\`examples/\`](${config.github}/tree/dev/examples) directory of the repo.`,
    "",
    ":::tip",
    "This doc is best viewed through the site search or through the _AI_.",
    ":::",
    "",
    "The descriptions for these examples are generated using the comments in the `sst.config.ts` of the app.",
    "",
    "#### Contributing",
    `To contribute an example or to edit one, submit a PR to the [repo](${config.github}).`,
    "Make sure to document the `sst.config.ts` in your example.",
    "",
  ];
}

function renderTdComment(parts: TypeDoc.CommentDisplayPart[]) {
  return parts.map((part) => part.text).join("");
}

function renderFooter() {
  return ["</div>"];
}

function configureLogger() {
  if (process.env.DEBUG) return;
  console.debug = () => {};
}

async function patchCode() {
  // patch Input
  fs.renameSync(
    "../pkg/platform/src/components/input.ts",
    "../pkg/platform/src/components/input.ts.bk"
  );
  fs.copyFileSync(
    "./input-patch.ts",
    "../pkg/platform/src/components/input.ts"
  );
  // patch global
  const globalType = fs.readFileSync("../pkg/platform/src/global.d.ts");
  fs.writeFileSync(
    "../pkg/platform/src/global-config.d.ts",
    globalType
      .toString()
      .trim()
      // move all exports out of `declare global {}`, b/c TypeDoc doesn't support it
      .replace("declare global {", "")
      .replace(/}$/, "")
      // change `export import $util` to `export const $util` b/c TypeDoc
      // tries to traverse the import and fails. We don't need to look into $util
      // anyways as we will link to the pulumi docs.
      .replace("export import $util", "export const $util")
  );
}

async function restoreCode() {
  // restore Input
  fs.renameSync(
    "../pkg/platform/src/components/input.ts.bk",
    "../pkg/platform/src/components/input.ts"
  );
  // restore global
  fs.rmSync("../pkg/platform/src/global-config.d.ts");
}
