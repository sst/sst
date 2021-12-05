"use strict";

import { createTransformer } from "babel-jest";

export default createTransformer({
  presets: ["@babel/preset-env"],
  plugins: ["@babel/plugin-proposal-class-properties"],
  babelrc: false,
  configFile: false,
});
