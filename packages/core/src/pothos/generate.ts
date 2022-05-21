import { build } from "esbuild";
import escodegen from "escodegen";
import { parse } from "acorn";
import { ancestor, fullAncestor, findNodeAt } from "acorn-walk";
import { printSchema, lexicographicSortSchema } from "graphql";
import url from "url";
import fs from "fs/promises";
import os from "os";
import path from "path";

interface GenerateOpts {
  schema: string;
}

// This function has a ton of `any` because acorn unfortunately has really poor typing
// We have to any escape hatch to avoid it, hopefully it improves one day
export async function generate(opts: GenerateOpts) {
  const result = await build({
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
          build.onResolve({ filter }, args => {
            return {
              path: args.path,
              external: true
            };
          });
        }
      }
    ]
  });

  const ast = parse(result.outputFiles[0].text, {
    sourceType: "module",
    ecmaVersion: 2022
  });

  const schemaBuilderImport: any = findNodeAt(
    ast,
    undefined,
    undefined,
    (type, node: any) => {
      if (
        type === "ImportDeclaration" &&
        node.source.value === "@pothos/core"
      ) {
        const def = node.specifiers.find(
          (s: any) => s.type === "ImportDefaultSpecifier"
        );
        if (!def) return false;
        return true;
      }
      return false;
    }
  );
  if (!schemaBuilderImport)
    throw new Error("Could not find schema builder import from @pothos/core");
  const schemaBuilder = schemaBuilderImport.node.specifiers.find(
    (s: any) => s.type === "ImportDefaultSpecifier"
  ).local.name;
  const builder = findNodeAt(ast, undefined, undefined, (type, node: any) => {
    return (
      type === "VariableDeclarator" &&
      node.init &&
      node.init.type === "NewExpression" &&
      node.init.callee.name === schemaBuilder
    );
  });
  if (!builder) throw new Error("Could not find new SchemaBuilder(...)");

  const references = new Set<any>();
  const variables = new Set();
  variables.add((builder.node as any).id.name);

  fullAncestor(ast, (node: any, ancestors: any[]) => {
    // Rewrite addScalarType to dummy
    if (
      node.type === "CallExpression" &&
      node.callee.property?.name === "addScalarType"
    ) {
      node.callee.property.name = "scalarType";
      node.arguments = [
        node.arguments[0],
        {
          ...node.arguments[1],
          name: "DUMMY_RESOLVER"
        }
      ];
    }

    // Include nodes that are pothos related
    const related =
      (node.type === "Identifier" && variables.has(node.name)) ||
      (node.type === "ImportDeclaration" &&
        node.source.value.includes("@pothos")) ||
      (node.type === "ExportNamedDeclaration" &&
        node.specifiers.some((x: any) => variables.has(x.local.name)));

    if (!related) return;
    references.add(ancestors[1]);
    // Keep track of variables related to pothos
    const variable = ancestors.find(x => x.type === "VariableDeclarator");
    if (!variable) return;
    if (!variable.id.name) return;
    variables.add(variable.id.name);
  });

  // Scrub pothos nodes of resolvers
  for (const node of references) {
    ancestor(node, {
      Property(node: any, ancestors: any[]) {
        if (!["resolve", "validate"].includes(node.key.name)) return;
        const parent = ancestors[ancestors.length - 2];
        parent.properties = parent.properties.filter((p: any) => p !== node);
      }
    });
  }

  (ast as any).body = [...references];
  const contents = [
    `const DUMMY_RESOLVER = { serialize: x => x, parseValue: x => x }; `,
    escodegen.generate(ast)
  ].join("\n");

  const out = path.join(path.dirname(opts.schema), "out.mjs");

  await fs.writeFile(out, contents, "utf8");
  const { schema } = await import(url.pathToFileURL(out).href);
  await fs.rm(out);
  const schemaAsString = printSchema(lexicographicSortSchema(schema));

  await fs.writeFile("schema.graphql", schemaAsString);

  return schemaAsString;
}
