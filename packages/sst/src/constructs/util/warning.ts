import { createAppContext } from "../context.js";

const WARNINGS = {
  "config.deprecated": `WARNING: The "config" prop is deprecated, and will be removed in SST v2. Pass Parameters and Secrets in through the "bind" prop. Read more about how to upgrade here — https://docs.serverless-stack.com/upgrade-guide#upgrade-to-v116`,
  "permissions.noConstructs": `WARNING: Passing SST constructs into "permissions" is deprecated, and will be removed in SST v2. Pass them into the "bind" prop. Read more about how to upgrade here — https://docs.serverless-stack.com/upgrade-guide#upgrade-to-v116`,
  "go.deprecated": `WARNING: The "go1.x" runtime is deprecated and replaced by the "go" runtime`,
};

export const useWarning = createAppContext(() => {
  const set = new Set<keyof typeof WARNINGS>();
  return {
    add(message: keyof typeof WARNINGS) {
      set.add(message);
    },
    print() {
      for (const key of set) {
        console.warn(WARNINGS[key]);
      }
    },
  };
});
