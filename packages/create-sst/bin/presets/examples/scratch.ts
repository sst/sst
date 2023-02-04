import * as fs from "fs/promises";

const input = process.argv[2];
const output = input.replace("functions", "packages/functions/src");
await fs.mkdir(output, { recursive: true });
await fs.rename(input, output);
console.log(output);
