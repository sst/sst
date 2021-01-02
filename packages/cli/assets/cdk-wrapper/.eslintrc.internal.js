module.exports = {
  root: true,
  parser: "@babel/eslint-parser",
  parserOptions: {
    babelOptions: {
      configFile: "./.build/.babelrc.json",
    },
  },
  plugins: ["@babel"],
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      parser: "@typescript-eslint/parser",
      plugins: ["@typescript-eslint"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    },
  ],
};
