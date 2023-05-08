export * as Pothos from "./pothos.js";
import babel, { NodePath, type types as t } from "@babel/core";
import generator from "@babel/generator";
import esbuild from "esbuild";
import fs from "fs/promises";
import path from "path";
import url from "url";

const { types, template } = babel;

const dummyResolver = template(
  "const %%dummy_resolver%% = { serialize: x => x, parseValue: x => x  };"
);

interface GenerateOpts {
  schema: string;
  internalPackages?: string[];
}

export async function generate(opts: GenerateOpts) {
  const { printSchema, lexicographicSortSchema } = await import("graphql");
  const contents = await extractSchema(opts);
  const out = path.join(path.dirname(opts.schema), "out.mjs");

  await fs.writeFile(out, contents, "utf8");
  const { schema } = await import(
    url.pathToFileURL(out).href + "?bust=" + Date.now()
  );
  await fs.rm(out);
  const schemaAsString = printSchema(lexicographicSortSchema(schema));
  return schemaAsString;
}

export async function extractSchema(opts: GenerateOpts) {
  const result = await esbuild.build({
    platform: "node",
    bundle: true,
    format: "esm",
    entryPoints: [opts.schema],
    external: ["@pothos/*"],
    keepNames: true,
    write: false,
    plugins: [
      {
        name: "externalize",
        setup(build) {
          const filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/; // Must not start with "/" or "./" or "../"
          build.onResolve({ filter }, (args) => {
            const packageName = args.path.match(/^(@[^\/]+\/[^\/]+|[^@/]+)/);
            if (packageName && opts.internalPackages?.includes(packageName[0]))
              return;
            return {
              path: args.path,
              external: true,
            };
          });
        },
      },
    ],
  });

  const globalPaths = new Set<t.Node>();

  const transformed = babel.transformSync(result.outputFiles[0].text, {
    sourceType: "module",
    plugins: [
      {
        name: "pothos-extractor",
        visitor: {
          Program(path) {
            const dummyResolverId =
              path.scope.generateUidIdentifier("DUMMY_RESOLVER");
            const resolverNode = dummyResolver({
              dummy_resolver: dummyResolverId,
            });
            path.unshiftContainer("body", resolverNode);
            path.scope.crawl();

            let schemaBuilder: NodePath<t.VariableDeclarator> = null!;

            path.traverse({
              ImportDeclaration(declarator) {
                if (!declarator) return;
                if (declarator.node.source.value.startsWith("@pothos")) return;
                declarator.remove();
              },
              VariableDeclarator(declarator) {
                if (schemaBuilder) return;

                const init = declarator.get("init");
                if (
                  init.isNewExpression() &&
                  init.get("callee").referencesImport("@pothos/core", "default")
                ) {
                  schemaBuilder = declarator;
                }
              },
              CallExpression(callPath) {
                if (
                  !types.isMemberExpression(callPath.node.callee) ||
                  !types.isIdentifier(callPath.node.callee.object) ||
                  !types.isIdentifier(callPath.node.callee.property) ||
                  !schemaBuilder ||
                  (callPath.node.callee.object.name !==
                    (schemaBuilder.node.id as any).name &&
                    callPath.node.callee.property.name !== "implement")
                ) {
                  return;
                }

                callPath.traverse({
                  Property(propertyPath) {
                    if (
                      types.isIdentifier(propertyPath.node.key) &&
                      ["resolve", "validate"].includes(
                        propertyPath.node.key.name
                      )
                    ) {
                      propertyPath.remove();
                    }
                  },
                });

                if (
                  callPath.node.callee.property.name === "addScalarType" ||
                  callPath.node.callee.property.name === "scalarType"
                ) {
                  callPath.node.callee.property =
                    types.identifier("scalarType");
                  callPath.node.arguments = [
                    callPath.node.arguments[0],
                    dummyResolverId,
                  ];
                }

                const bindings = getBindings(callPath, globalPaths);
                for (const binding of bindings) {
                  globalPaths.add(findRootBinding(binding).node);
                }

                globalPaths.add(findRootBinding(callPath).node);
              },
              ExportDeclaration(exportPath) {
                globalPaths.add(exportPath.node);
              },
            });
          },
        },
      },
    ],
  });

  if (!transformed) throw new Error("Could not transform file");

  const contents = (generator as any).default(
    types.program([...globalPaths] as any[])
  );

  return contents.code;
}

function getBindings(path: NodePath<t.Node>, globalPaths: Set<any>) {
  const bindings: Array<NodePath<t.Node>> = [];

  path.traverse({
    Expression(expressionPath) {
      if (!expressionPath.isIdentifier()) return;

      const binding = path.scope.getBinding(expressionPath as any);

      if (
        !binding ||
        globalPaths.has(binding.path) ||
        bindings.includes(binding.path)
      )
        return;

      const rootBinding = findRootBinding(binding.path);

      // prevents infinite loop in a few cases like having arguments in a function declaration
      // if the path being checked is the same as the latest path, then the bindings will be same
      if (path === rootBinding) {
        bindings.push(binding.path);
        return;
      }

      const bindingOfBindings = getBindings(rootBinding, globalPaths);

      bindings.push(...bindingOfBindings, binding.path);
    },
  });

  for (const binding of bindings) {
    globalPaths.add(findRootBinding(binding).node);
  }

  return bindings;
}

function findRootBinding(path: NodePath<t.Node>) {
  let rootPath = path;
  while (
    rootPath.parentPath?.node !== undefined &&
    !rootPath.parentPath?.isProgram()
  ) {
    rootPath = rootPath.parentPath!;
  }

  return rootPath;
}
