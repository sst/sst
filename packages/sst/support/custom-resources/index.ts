import { AuthKeys } from "./auth-keys.js";
import { AssetReplacer } from "./asset-replacer.js";
import { CloudFrontInvalidator } from "./cloudfront-invalidator.js";
import { ApiGatewayCloudWatchRole } from "./apigateway-cloudwatch-role.js";
import { FunctionInvoker } from "./function-invoker.js";
import { log, wrapper } from "./util.js";
import { SourcemapUploader } from "./sourcemap-uploader.js";
import { S3Uploader, batchProcessor } from "./s3-uploader.js";
import { SecretPrefetcher } from "./secret-prefetcher.js";

export interface BaseProcessorEvent {
  processorType: string;
}

export const handler = (event: any) => {
  return event.RequestType
    ? customResourceEventHandler(event)
    : lambdaEventHandler(event);
};

const customResourceEventHandler = wrapper(async (cfnRequest: any) => {
  const { ResponseURL, ...other } = cfnRequest;
  log("Handling custom resource event", other);

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
    case "Custom::FunctionInvoker":
      await FunctionInvoker(cfnRequest);
      break;
    case "Custom::SourcemapUploader":
      await SourcemapUploader(cfnRequest);
      break;
    case "Custom::S3Uploader":
      await S3Uploader(cfnRequest);
      break;
    case "Custom::SecretPrefetcher":
      await SecretPrefetcher(cfnRequest);
      break;
  }
});

const lambdaEventHandler = async (event: BaseProcessorEvent) => {
  log("Handling lambda event", event);

  switch (event.processorType) {
    case "S3Uploader::BatchProcessor":
      await batchProcessor(event as any);
      break;
  }
};
