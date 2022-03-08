const { printSchemaWithDirectives } = require("@graphql-tools/utils");
const { stripIgnoredCharacters } = require("graphql");

const print = (schema) => `
  export const typeDefs = \`${schema}\`;
`;

module.exports.plugin = (schema) =>
  print(stripIgnoredCharacters(printSchemaWithDirectives(schema)));
