import { Pothos } from "../../dist/index.js";

const schema = await Pothos.generate({
  schema: "./schema.ts",
});
console.log(schema);
