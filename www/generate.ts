import * as path from "path";
import * as fs from "fs/promises";
import * as TypeDoc from "typedoc";

try {
  await configureLogger();
  await patchInput();
  await main();
} finally {
  await restoreInput();
}

async function main() {
  const modules = await buildDocs();
  for (const module of modules) {
    const fileName = `${module.name}.mdx`;
    console.info(`Generating ${fileName}...`);
    await fs.writeFile(
      path.join("src/content/docs/docs/component", fileName),
      [
        renderHeader(),
        renderImports(),
        renderAbout(),
        renderConstructor(),
        renderMethods(),
        renderProperties(),
        renderInterfaces(),
        renderNestedTypes(),
      ]
        .flat()
        .join("\n")
    );

    function renderHeader() {
      return [
        `---`,
        `title: ${useClassName()}`,
        `description: Reference doc for the \`${useClassName()}\` component`,
        `---`,
      ];
    }

    function renderImports() {
      return [
        ``,
        `import Segment from '../../../../../components/tsdoc/Segment.astro';`,
        `import Section from '../../../../../components/tsdoc/Section.astro';`,
        `import InlineSection from '../../../../../components/tsdoc/InlineSection.astro';`,
      ];
    }

    function renderAbout() {
      console.debug(` - about`);
      const lines = [];
      const comment = useClassComment();

      lines.push(``, `<Section type="about">`);

      // description
      lines.push(renderComment(comment.summary));

      // examples
      const examples = comment.blockTags.filter(
        (tag) => tag.tag === "@example"
      );
      if (examples.length) {
        lines.push(
          ``,
          ...examples.map((example) => renderComment(example.content))
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
          ...signature.parameters.map(
            (param) =>
              `- <p><code class="key">${param.name}</code> ${renderType(
                param.type!
              )}</p>`
          ),
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

    function renderProperties() {
      const lines: string[] = [];
      const properties = useClassGetters();
      if (!properties.length) return lines;

      lines.push(``, `## Properties`);

      for (const property of properties) {
        console.debug(` - property ${property.name}`);
        const nestedTypeName = `${property.name[0].toLocaleUpperCase()}${property.name.slice(
          1
        )}Props`;
        lines.push(
          ``,
          `<Segment>`,
          // name
          `### ${property.name}`,
          // description
          ...(property.getSignature?.comment?.summary
            ? [renderComment(property.getSignature?.comment?.summary!)]
            : []),
          // type
          `<Section type="parameters">`,
          `<InlineSection>`,
          `**Type** ${renderType(property.getSignature?.type!).replace(
            "{{_NESTED_TYPE_}}",
            `[${nestedTypeName}](#${nestedTypeName.toLowerCase()})`
          )}`,
          `</InlineSection>`,
          `</Section>`,
          `</Segment>`
        );
      }
      return lines;
    }

    function renderInterfaces() {
      const lines: string[] = [];

      for (const int of useInterfaces()) {
        console.debug(` - interface ${int.name}`);
        // interface name
        lines.push(``, `## ${int.name}`);

        // description
        if (int.comment?.summary) {
          lines.push(``, renderComment(int.comment?.summary!));
        }

        // props
        if (!int.children?.length)
          throw new Error(`Interface ${int.name} has no props`);

        for (const prop of int.children) {
          console.debug(`   - interface prop ${prop.name}`);
          const nestedTypeName = `${prop.name[0].toLocaleUpperCase()}${prop.name.slice(
            1
          )}Props`;
          lines.push(
            `<Segment>`,
            // prop name
            `### ${prop.name}${prop.flags.isOptional ? "?" : ""}`,
            // prop type
            `<Section type="parameters">`,
            `<InlineSection>`,
            `**Type** ${renderType(prop.type!).replace(
              "{{_NESTED_TYPE_}}",
              `[${nestedTypeName}](#${nestedTypeName.toLowerCase()})`
            )}`,
            `</InlineSection>`,
            `</Section>`,
            // prop default value
            ...(renderInterfaceDefaultTag(prop) ?? []),
            // prop description
            ...(renderInterfaceDescription(prop) ?? []),
            // prop examples
            ...(renderInterfaceExamples(prop) ?? []),
            `</Segment>`
          );
        }
      }

      return lines;
    }

    function renderNestedTypes() {
      const lines: string[] = [];

      // properties' nested types
      useClassGetters().forEach((property) =>
        renderEach(property.getSignature!)
      );

      // interfaces' nested types
      useInterfaces().forEach((int) => int.children?.forEach(renderEach));

      function renderEach(
        prop:
          | TypeDoc.Models.DeclarationReflection
          | TypeDoc.Models.SignatureReflection
      ) {
        const nestedTypes = useNestedTypes(prop.type!);
        if (!nestedTypes.length) return;

        // name
        lines.push(
          ``,
          `## ${prop.name[0].toLocaleUpperCase()}${prop.name.slice(1)}Props`
        );

        // description
        if (prop.comment?.summary) {
          lines.push(``, renderComment(prop.comment?.summary!));
        }

        // props
        lines.push(
          `<InlineSection>`,
          ...nestedTypes.flatMap(({ prefix, subType }) => [
            `- <p><code class="key">${prefix}${subType.name}${
              prop.flags.isOptional ? "?" : ""
            }</code>${renderType(subType.type!).replaceAll(
              "{{_NESTED_TYPE_}}",
              "Object"
            )}</p>`,
            ...(renderInterfaceDefaultTag(subType) ?? []),
            ...(renderInterfaceDescription(subType) ?? []),
            ...(renderInterfaceExamples(subType) ?? []),
          ]),
          `</InlineSection>`
        );
      }
      return lines;
    }

    function renderInterfaceDefaultTag(
      prop: TypeDoc.Models.DeclarationReflection
    ) {
      const defaultTag = prop.comment?.blockTags.find(
        (tag) => tag.tag === "@default"
      );
      if (!defaultTag) return;
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
          : `**Default** ${renderComment(defaultTag.content)}`,
        `</InlineSection>`,
      ];
    }

    function renderInterfaceDescription(
      prop: TypeDoc.Models.DeclarationReflection
    ) {
      if (!prop.comment?.summary) return;
      return [renderComment(prop.comment?.summary)];
    }

    function renderInterfaceExamples(
      prop: TypeDoc.Models.DeclarationReflection
    ) {
      return prop.comment?.blockTags
        .filter((tag) => tag.tag === "@example")
        .flatMap((tag) => renderComment(tag.content));
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
      // TODO fix indention for nested types
      // TODO render this
      /**
       * The domain to be assigned to the website URL (ie. domain.com).
       *
       * Supports domains that are hosted either on [Route 53](https://aws.amazon.com/route53/) or externally.
       */
      // TODO unhandled linking to interfaces in another component
      // TODO function link to esbuild `Loader`
      // TODO link `Transform` to transform doc (add the same line, expand)
      if (type.type === "intrinsic") return renderIntrisicType(type);
      if (type.type === "literal") return renderLiteralType(type);
      if (type.type === "templateLiteral")
        return renderTemplateLiteralType(type);
      if (type.type === "union") return renderUnionType(type);
      if (type.type === "array") return renderArrayType(type);
      if (type.type === "reference" && type.package === "typescript")
        return renderTypescriptType(type);
      if (type.type === "reference" && type.package === "sst")
        return renderSstType(type);
      if (type.type === "reference" && type.package === "@pulumi/pulumi")
        return renderPulumiType(type);
      if (type.type === "reference" && type.package?.startsWith("@pulumi/"))
        return renderPulumiProviderType(type);
      if (type.type === "reference" && type.package === "esbuild")
        return renderEsbuildType(type);
      if (type.type === "reflection" && type.declaration.children?.length)
        return renderObjectType(type);

      // @ts-expect-error
      delete type._project;
      console.log(type);
      throw new Error(`Unsupported type "${type.type}"`);

      function renderIntrisicType(type: TypeDoc.Models.IntrinsicType) {
        return `<code class="primitive">${type.name}</code>`;
      }

      function renderLiteralType(type: TypeDoc.Models.LiteralType) {
        // ie. architecture: "arm64"
        return `<code class="primitive">${type.value}</code>`;
      }

      function renderTemplateLiteralType(
        type: TypeDoc.Models.TemplateLiteralType
      ) {
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
        return `<code class="primitive">${type.head}$\\{${type.tail[0][0].name}\\}${type.tail[0][1]}</code>`;
      }

      function renderUnionType(type: TypeDoc.Models.UnionType) {
        return type.types
          .map((t) => renderType(t))
          .join(`<code class="symbol"> | </code>`);
      }

      function renderArrayType(type: TypeDoc.Models.ArrayType) {
        return `${renderType(type.elementType)}<code class="symbol">[]</code>`;
      }

      function renderTypescriptType(type: TypeDoc.Models.ReferenceType) {
        // ie. Record<string, string>
        return [
          `<code class="primitive">${type.name}</code>`,
          `<code class="symbol">&lt;</code>`,
          type.typeArguments?.map((t) => renderType(t)).join(", "),
          `<code class="symbol">&gt;</code>`,
        ].join("");
      }

      function renderSstType(type: TypeDoc.Models.ReferenceType) {
        if (type.name === "Transform" || type.name === "Input") {
          return [
            `<code class="primitive">${type.name}</code>`,
            `<code class="symbol">&lt;</code>`,
            renderType(type.typeArguments?.[0]!),
            `<code class="symbol">&gt;</code>`,
          ].join("");
        }
        return `[<code class="type">${
          type.name
        }</code>](#${type.name.toLowerCase()})`;
      }

      function renderPulumiType(type: TypeDoc.Models.ReferenceType) {
        if (type.name === "Output" || type.name === "Input") {
          return [
            `<code class="primitive">${type.name}</code>`,
            `<code class="symbol">&lt;</code>`,
            renderType(type.typeArguments?.[0]!),
            `<code class="symbol">&gt;</code>`,
          ].join("");
        }
        if (type.name === "UnwrappedObject") {
          return renderType(type.typeArguments?.[0]!);
        }
        if (type.name === "ComponentResourceOptions") {
          return `[<code class="type">${type.name}</code>](https://www.pulumi.com/docs/concepts/options/)`;
        }

        console.error(type);
        throw new Error(`Unsupported @pulumi/pulumi type`);
      }

      function renderPulumiProviderType(type: TypeDoc.Models.ReferenceType) {
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
            DistributionCustomErrorResponse: "cloudfront/distribution",
          }[type.name];
          if (!link) {
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

      function renderEsbuildType(type: TypeDoc.Models.ReferenceType) {
        return `[<code class="type">${type.name}</code>](https://esbuild.github.io/api/#build)`;
      }

      function renderObjectType(type: TypeDoc.Models.ReflectionType) {
        return `<code class="primitive">{{_NESTED_TYPE_}}</code>`;
      }
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
      return (useClass().children ?? []).filter(
        (c) => c.kind === TypeDoc.ReflectionKind.Accessor && c.flags.isPublic
      );
    }

    function useInterfaces() {
      return (module.children ?? []).filter(
        (c) => c.kind === TypeDoc.ReflectionKind.Interface
      );
    }

    function useNestedTypes(
      type: TypeDoc.SomeType
    ): { prefix: string; subType: TypeDoc.Models.DeclarationReflection }[] {
      if (type.type === "union")
        return type.types.flatMap((t) => useNestedTypes(t));
      if (type.type === "array") return useNestedTypes(type.elementType);
      if (type.type === "reference")
        return (type.typeArguments ?? []).flatMap((t) => useNestedTypes(t));
      if (type.type === "reflection")
        return type.declaration.children!.flatMap((child) => [
          { prefix: "", subType: child },
          ...useNestedTypes(child.type!).map(({ prefix, subType }) => ({
            prefix: `${child.name}.${prefix}`,
            subType,
          })),
        ]);

      return [];
    }
  }
}

async function buildDocs() {
  // Generate project reflection
  const app = await TypeDoc.Application.bootstrap({
    // Ignore type errors caused by patching `Input<>`.
    skipErrorChecking: true,
    // Disable parsing @default tags as ```ts block code.
    jsDocCompatibility: {
      defaultTag: false,
    },
    entryPoints: [
      "../pkg/platform/src/components/aws/secret.ts",
      "../pkg/platform/src/components/aws/bucket.ts",
      "../pkg/platform/src/components/aws/cron.ts",
      "../pkg/platform/src/components/aws/function.ts",
      "../pkg/platform/src/components/aws/postgres.ts",
      "../pkg/platform/src/components/aws/vector.ts",
      "../pkg/platform/src/components/aws/astro.ts",
      "../pkg/platform/src/components/aws/nextjs.ts",
      "../pkg/platform/src/components/aws/remix.ts",
      //"../pkg/platform/src/components/aws/static-site.ts",
      //"../pkg/platform/src/components/aws/queue.ts",
      //"../pkg/platform/src/components/aws/router.ts",
      //"../pkg/platform/src/components/aws/sns-topic.ts",
      //"../pkg/platform/src/components/aws/dynamodb-table.ts",
      //"../pkg/platform/src/components/aws/apigateway-httpapi.ts",
      "../pkg/platform/src/components/cloudflare/worker.ts",
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

function configureLogger() {
  if (process.env.DEBUG) return;
  console.debug = () => {};
}

async function patchInput() {
  await fs.rename(
    "../pkg/platform/src/components/input.ts",
    "../pkg/platform/src/components/input.ts.bk"
  );
  await fs.copyFile(
    "./input-patch.ts",
    "../pkg/platform/src/components/input.ts"
  );
}

async function restoreInput() {
  await fs.rename(
    "../pkg/platform/src/components/input.ts.bk",
    "../pkg/platform/src/components/input.ts"
  );
}
