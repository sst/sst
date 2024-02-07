import fs from "fs/promises";
import TypeDoc from "typedoc";

const modules = await buildDocs();
for (const module of modules) {
  const fileName = `docs/${module.name}.md`;
  console.info(`Generating ${fileName}...`);
  const lines: string[] = [];
  printHeader();
  printImports();
  printAbout();
  printConstructor();
  printMethods();
  printProperties();
  printInterfaces();
  await fs.writeFile(fileName, lines.join("\n"));

  function printHeader() {
    lines.push(
      `---`,
      `title: ${useClassName()}`,
      `description: Reference doc for the \`${useClassName()}\` component`,
      `---`
    );
  }

  function printImports() {
    lines.push(
      ``,
      `import Segment from '../../../components/tsdoc/Segment.astro';`,
      `import Section from '../../../components/tsdoc/Section.astro';`,
      `import InlineSection from '../../../components/tsdoc/InlineSection.astro';`
    );
  }

  function printAbout() {
    console.debug(` - about`);
    const comment = useClassComment();

    // description
    lines.push(``, renderComment(comment.summary));

    // examples
    const examples = comment.blockTags.filter((tag) => tag.tag === "@example");
    if (examples.length) {
      lines.push(``, `## Examples`, ``);
      for (const example of examples) {
        lines.push(renderComment(example.content));
      }
    }

    lines.push(``, `---`);
  }

  function printConstructor() {
    console.debug(` - constructor`);
    const signature = useClassConstructor().signatures![0];

    lines.push(``, `## Constructor`, ``, `<Segment>`);

    // signature
    lines.push(
      `<Section type="signature">`,
      "```ts",
      renderFunctionSignature(signature),
      "```",
      `</Section>`
    );

    // parameters
    if (signature.parameters?.length) {
      lines.push(
        ``,
        `<Section type="parameters">`,
        `#### Parameters`,
        ...signature.parameters.flatMap(
          (param) =>
            `- <p><code class="key">${param.name}</code> ${renderType(
              param.type!
            )}</p>`
        ),
        `</Section>`
      );
    }

    lines.push(`</Segment>`);
  }

  function printMethods() {
    const methods = useClassMethods();
    if (!methods?.length) return;

    console.error(methods[0].name);
    throw new Error("Need to implement methods");

    lines.push(
      ``,
      `## Methods`,
      ``,
      `<Segment>`,
      `### noop`,
      `<Section type="signature">`,
      `</Section>`,
      `</Segment>`
    );
  }

  function printProperties() {
    const props = useClassGetters();
    if (!props?.length) return;

    lines.push(``, `## Properties`);

    for (const prop of props) {
      console.debug(` - property ${prop.name}`);
      lines.push(``, `<Segment>`, `### ${prop.name}`);
      // type
      lines.push(
        `<InlineSection>`,
        `**Type** ${renderType(prop.getSignature?.type!)}`,
        `</InlineSection>`
      );
      // description
      if (prop.getSignature?.comment?.summary) {
        lines.push(renderComment(prop.getSignature?.comment?.summary!));
      }
      lines.push(`</Segment>`);
    }
  }

  function printInterfaces() {
    const interfaces = useInterfaces();
    if (!interfaces?.length) return;

    for (const int of interfaces) {
      console.debug(` - interface ${int.name}`);
      // interface name
      lines.push(``, `## ${int.name}`);

      // description
      if (int.comment?.summary) {
        lines.push(``, renderComment(int.comment?.summary!));
      }

      // properties
      if (!int.children?.length)
        throw new Error(`Interface ${int.name} has no props`);

      for (const prop of int.children) {
        console.debug(`   - interface prop ${prop.name}`);
        lines.push(`<Segment>`);
        // name
        lines.push(`### ${prop.name}${prop.flags.isOptional ? "?" : ""}`);
        // type
        lines.push(
          ``,
          `<InlineSection>`,
          `**Type** ${renderType(prop.type!)}`,
          `</InlineSection>`
        );
        // default value
        const defaultTag = prop.comment?.blockTags.find(
          (tag) => tag.tag === "@default"
        );
        if (defaultTag) {
          lines.push(
            ``,
            `<InlineSection>`,
            `**Default** ${renderComment(defaultTag.content)}`,
            `</InlineSection>`
          );
        }
        // description
        if (prop.comment?.summary) {
          lines.push(renderComment(prop.comment?.summary));
        }
        // examples
        prop.comment?.blockTags
          .filter((tag) => tag.tag === "@example")
          .forEach((tag) => lines.push(renderComment(tag.content)));
        lines.push(`</Segment>`);
      }
    }
  }

  function renderFunctionSignature(
    signature: TypeDoc.Models.SignatureReflection
  ) {
    const parameters = (signature.parameters ?? [])
      .map((param) => param.name + (param.flags.isOptional ? "?" : ""))
      .join(", ");
    return `${signature.name}(${parameters})`;
  }

  function renderComment(parts: TypeDoc.Models.CommentDisplayPart[]) {
    return parts.map((part) => part.text).join("");
  }

  function renderType(type: TypeDoc.SomeType): string {
    if (type.type === "intrinsic") {
      return `<code class="primitive">${type.name}</code>`;
    }
    if (type.type === "literal") {
      // ie. architecture: "arm64"
      return `<code class="primitive">${type.value}</code>`;
    }
    if (type.type === "templateLiteral") {
      // TODO unhandled
      // ie. memory: `${number} MB`
      return type.tail.map(([e1, e2]) => `${renderType(e1)}${e2}`).join("");
    }
    if (type.type === "union") {
      return type.types.map(renderType).join(`<code class="symbol"> | </code>`);
    }
    if (type.type === "array") {
      return `${renderType(type.elementType)}[]`;
    }

    if (type.type === "reference" && type.package === "typescript") {
      // TODO unhandled in function.ts
      // ie. Record<string, string>
      return `<code class="type">${type.name}<${type.typeArguments
        ?.map(renderType)
        .join(", ")}></code>`;
    }

    if (type.type === "reference" && type.package === "sst") {
      if (type.name === "Transform") {
        return `<code class="type">${type.name}<${renderType(
          type.typeArguments?.[0]!
        )}></code>`;
      }
      return `[<code class="type">${type.name}</code>](#${type.name})`;
    }

    if (type.type === "reference" && type.package === "@pulumi/pulumi") {
      // TODO unhandled `Output<>`
      if (type.name === "Output" || type.name === "Input") {
        return `<code class="type">${type.name}<${renderType(
          type.typeArguments?.[0]!
        )}></code>`;
      }
      if (type.name === "ComponentResourceOptions") {
        return `[<code class="type">${type.name}</code>](https://www.pulumi.com/docs/concepts/options/)`;
      }
    }

    if (type.type === "reference" && type.package === "@pulumi/aws") {
      return `[<code class="type">${
        type.name
      }</code>](https://www.pulumi.com/registry/packages/aws/api-docs/s3/${type.name.toLowerCase()}/)`;
    }

    if (type.type === "reference" && type.package === "esbuild") {
      return `[<code class="type">${type.name}</code>](https://esbuild.github.io/api/#build)`;
    }

    if (type.type === "reflection" && type.declaration.children?.length) {
      // TODO unhandled `nodes`
      return [
        `<code class="type">Object</code>`,
        ...type.declaration.children.flatMap(
          (child) =>
            `- <p><code class="key">${child.name}</code> ${renderType(
              child.type!
            )}</p>`
        ),
      ].join("\n");
    }

    throw new Error(`Unsupported parameter type "${type.type}"`);
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
        c.signatures &&
        !c.signatures[0].comment?.modifierTags.has("@internal")
    );
  }

  function useClassGetters() {
    return useClass().children?.filter(
      (c) => c.kind === TypeDoc.ReflectionKind.Accessor && c.flags.isPublic
    );
  }

  function useInterfaces() {
    return module.children?.filter(
      (c) => c.kind === TypeDoc.ReflectionKind.Interface
    );
  }
}

async function buildDocs() {
  // Generate project reflection
  const app = await TypeDoc.Application.bootstrap({
    entryPoints: [
      "../pkg/platform/src/components/bucket.ts",
      "../pkg/platform/src/components/function.ts",
      "../pkg/platform/src/components/nextjs.ts",
    ],
    tsconfig: "../pkg/platform/tsconfig.json",
  });
  const project = await app.convert();
  if (!project) throw new Error("Failed to convert project");

  // Generate JSON (generated for debugging purposes)
  await app.generateJson(project, "docs.json");

  // Return classes
  return project.children!.filter(
    (c) => c.kind === TypeDoc.ReflectionKind.Module
  );
}
