import { createAppContext } from "../context.js";
import { Colors } from "../../cli/colors.js";

const WARNINGS = {
  "config.deprecated": `The "config" prop is deprecated, and will be removed in SST v2. Pass Parameters and Secrets in through the "bind" prop. Read more about how to upgrade here — https://docs.serverless-stack.com/upgrade-guide#upgrade-to-v116`,
  "permissions.noConstructs": `Passing SST constructs into "permissions" is deprecated, and will be removed in SST v2. Pass them into the "bind" prop. Read more about how to upgrade here — https://docs.serverless-stack.com/upgrade-guide#upgrade-to-v116`,
  "go.deprecated": `The "go1.x" runtime is deprecated and replaced by the "go" runtime`,
  "remix.cjs": `"RemixSite" will soon deprecate support for the "cjs" output format. Please update your "remix.config.js" to set "serverModuleFormat" to "esm".`,
};

export const useWarning = createAppContext(() => {
  const set = new Set<keyof typeof WARNINGS>();
  return {
    add(message: keyof typeof WARNINGS) {
      set.add(message);
    },
    print() {
      for (const key of set) {
        Colors.line(Colors.warning(`Warning: ${WARNINGS[key]}`));
      }
    },
  };
});
