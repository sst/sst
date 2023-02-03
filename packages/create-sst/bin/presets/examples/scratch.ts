import * as fs from "fs/promises";

const input = process.argv[2];
const output = input.replace("MyStack.ts", "ExampleStack.ts");
await fs.rename(input, output);
console.log(output);
