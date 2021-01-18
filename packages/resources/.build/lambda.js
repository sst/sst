var __defProp = Object.defineProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", {value: true});
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, {get: all[name], enumerable: true});
};

// test/lambda.js
__export(exports, {
  handler: () => handler
});
async function handler() {
  return "Hello World";
}
//# sourceMappingURL=lambda.js.map
