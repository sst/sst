import { extend, extract } from "create-sst";
export default [
  extend("presets/base/starter"),
  extend("presets/base/monorepo"),
  extract(),
];
