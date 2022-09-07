import { patch, remove, extend, extract, install } from "create-sst";
export default [
  extend("presets/graphql/basic"),
  extract(),
  install({
    packages: ["hygen"],
    dev: true
  }),
  patch({
    file: "package.json",
    operations: [{ op: "add", path: "/scripts/gen", value: "hygen" }]
  }),
  install({
    packages: ["kysely", "kysely-data-api"],
    path: "services"
  }),
  install({
    packages: ["@vanilla-extract/css", "@vanilla-extract/vite-plugin", "react-icons"],
    path: "web"
  }),
  remove("web/src/index.css"),
  remove("web/public/vite.svg"),
  remove("web/src/assets/react.svg"),
];