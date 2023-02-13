import { AuthKeys } from "./auth-keys.js";
import { AssetReplacer } from "./asset-replacer.js";
import { CloudFrontInvalidator } from "./cloudfront-invalidator.js";
import { ApiGatewayCloudWatchRole } from "./apigateway-cloudwatch-role.js";
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
    case "Custom::CloudFrontInvalidator":
      await CloudFrontInvalidator(cfnRequest);
      break;
    case "Custom::APIGatewayCloudWatchRole":
      await ApiGatewayCloudWatchRole(cfnRequest);
      break;
  }
});
