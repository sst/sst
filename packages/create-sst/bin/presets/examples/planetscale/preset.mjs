export default [
  extend("presets/base/example"),
  extract(),
  install({
    packages: ["planetscale-node"],
    path: "backend",
  }),
];
