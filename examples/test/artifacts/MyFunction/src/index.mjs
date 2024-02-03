import { createRequire as topLevelCreateRequire } from 'module';
const require = topLevelCreateRequire(import.meta.url);
import { fileURLToPath as topLevelFileUrlToPath, URL as topLevelURL } from "url"
const __dirname = topLevelFileUrlToPath(new topLevelURL(".", import.meta.url))

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.mjs
async function handler() {
  let size = 10;
  let char = "a";
  let largeString = char.repeat(size);
  return {
    statusCode: 200,
    body: largeString
  };
}
__name(handler, "handler");
export {
  handler
};
