module.exports = {
  root: true,
  parser: "@babel/eslint-parser",
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: [
        [
          "@babel/preset-env",
          {
            targets: {
              node: "10",
            },
          },
        ],
      ],
      plugins: ["@babel/plugin-proposal-class-properties"],
    },
  },
  plugins: ["@babel"],
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      plugins: ["@typescript-eslint"],
      parser: "@typescript-eslint/parser",
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    },
  ],
};
