import { AuthKeys } from "./auth-keys.js";
import { AssetReplacer } from "./asset-replacer.js";
import { log, wrapper } from "./util.js";

export const handler = wrapper(async (cfnRequest: any) => {
  log("onEventHandler", cfnRequest);

  switch (cfnRequest.ResourceType) {
    case "Custom::AuthKeys":
      await AuthKeys(cfnRequest);
      break;
    case "Custom::AssetReplacer":
      await AssetReplacer(cfnRequest);
      break;
  }
});
