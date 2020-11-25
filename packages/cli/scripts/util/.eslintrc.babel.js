module.exports = {
  parser: "@babel/eslint-parser",
  parserOptions: {
    babelOptions: {
      configFile: "./build/.babelrc.json",
    },
  },
  plugins: ["@babel"],
};
