import { build } from "esbuild";
import escodegen from "escodegen";
import { parse } from "acorn";
import { ancestor, fullAncestor, findNodeAt } from "acorn-walk";
import { printSchema, lexicographicSortSchema } from "graphql";

const result = await build({
  platform: "node",
  bundle: true,
  format: "esm",
  entryPoints: ["../backend/functions/graphql/schema.ts"],
  outfile: "./out.mjs",
  external: ["@pothos/*"],
  keepNames: true,
  write: false,
  plugins: [
    {
      name: "externalize",
      setup(build) {
        const filter = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/; // Must not start with "/" or "./" or "../"
        build.onResolve({ filter }, (args) => {
          return {
            path: args.path,
            external: true,
          };
        });
      },
    },
  ],
});

const ast = parse(result.outputFiles[0].text, {
  sourceType: "module",
  ecmaVersion: 2022,
});

const schemaBuilderImport = findNodeAt(ast, null, null, (type, node) => {
  if (type === "ImportDeclaration" && node.source.value === "@pothos/core") {
    const def = node.specifiers.find(
      (s) => s.type === "ImportDefaultSpecifier"
    );
    if (!def) return;
    return true;
  }
});
if (!schemaBuilderImport)
  throw new Error("Could not find schema builder import from @pothos/core");
const schemaBuilder = schemaBuilderImport.node.specifiers.find(
  (s) => s.type === "ImportDefaultSpecifier"
).local.name;
const builder = findNodeAt(ast, null, null, (type, node) => {
  return (
    type === "VariableDeclarator" &&
    node.init &&
    node.init.type === "NewExpression" &&
    node.init.callee.name === schemaBuilder
  );
});
if (!builder) throw new Error("Could not find new SchemaBuilder(...)");

const references = new Set();
const variables = new Set();
variables.add(builder.node.id.name);

fullAncestor(ast, (node, ancestors) => {
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
        name: "DUMMY_RESOLVER",
      },
    ];
  }

  // Include nodes that are pothos related
  const related =
    (node.type === "Identifier" && variables.has(node.name)) ||
    (node.type === "ImportDeclaration" &&
      node.source.value.includes("@pothos")) ||
    (node.type === "ExportNamedDeclaration" &&
      node.specifiers.some((x) => variables.has(x.local.name)));

  if (!related) return;
  references.add(ancestors[1]);
  // Keep track of variables related to pothos
  const variable = ancestors.find((x) => x.type === "VariableDeclarator");
  if (!variable) return;
  if (!variable.id.name) return;
  variables.add(variable.id.name);
});

// Scrub pothos nodes of resolvers
for (const node of references) {
  ancestor(node, {
    Property(node, ancestors) {
      if (!["resolve", "validate"].includes(node.key.name)) return;
      const parent = ancestors[ancestors.length - 2];
      parent.properties = parent.properties.filter((p) => p !== node);
    },
  });
}

ast.body = [...references];
const contents = [
  `const DUMMY_RESOLVER = { serialize: x => x, parseValue: x => x }`,
  escodegen.generate(ast),
].join("\n");

import fs from "fs/promises";

import path from "path";
import url from "url";
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const out = path.join(__dirname, "out.mjs");

await fs.writeFile(out, contents, "utf8");
const { schema } = await import("./out.mjs");
await fs.rm(out);
const schemaAsString = printSchema(lexicographicSortSchema(schema));

await fs.writeFile("schema.graphql", schemaAsString);

import { execSync } from "child_process";
execSync("npx zeus ./schema.graphql . --reactQuery");
