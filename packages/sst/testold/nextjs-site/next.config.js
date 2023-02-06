module.exports = function (...args) {
  let original = require("./next.config.original.1634183702820.js");
  const finalConfig = {};
  const target = { target: "serverless" };
  if (
    typeof original === "function" &&
    original.constructor.name === "AsyncFunction"
  ) {
    // AsyncFunctions will become promises
    original = original(...args);
  }
  if (original instanceof Promise) {
    // Special case for promises, as it's currently not supported
    // and will just error later on
    return original
      .then((originalConfig) => Object.assign(finalConfig, originalConfig))
      .then((config) => Object.assign(config, target));
  } else if (typeof original === "function") {
    Object.assign(finalConfig, original(...args));
  } else if (typeof original === "object") {
    Object.assign(finalConfig, original);
  }
  Object.assign(finalConfig, target);
  return finalConfig;
};
