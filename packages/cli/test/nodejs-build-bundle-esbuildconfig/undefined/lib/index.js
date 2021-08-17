var __create = Object.create;
var __defProp = Object.defineProperty;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __markAsModule = (target) =>
  __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __exportStar = (target, module2, desc) => {
  if (
    (module2 && typeof module2 === "object") ||
    typeof module2 === "function"
  ) {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, {
          get: () => module2[key],
          enumerable:
            !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable,
        });
  }
  return target;
};
var __toModule = (module2) => {
  return __exportStar(
    __markAsModule(
      __defProp(
        module2 != null ? __create(__getProtoOf(module2)) : {},
        "default",
        module2 && module2.__esModule && "default" in module2
          ? { get: () => module2.default, enumerable: true }
          : { value: module2, enumerable: true }
      )
    ),
    module2
  );
};

// lib/index.ts
__markAsModule(exports);
__export(exports, {
  default: () => main,
});
var sst = __toModule(require("@serverless-stack/resources"));
var MySampleStack = class extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    new sst.Function(this, "MyFunction", {
      handler: "lambda.main",
      bundle: {
        esbuildConfig: "esbuild-config.js",
      },
    });
  }
};
function main(app) {
  new MySampleStack(app, "sample");
}
//# sourceMappingURL=index.js.map
