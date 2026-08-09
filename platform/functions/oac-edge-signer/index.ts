// Lambda@Edge function for automatic SHA256 header signing
// This function adds the required x-amz-content-sha256 header for POST/PUT/PATCH/QUERY requests
// going to Lambda function URLs with Origin Access Control enabled.

import type { CloudFrontRequestHandler } from "aws-lambda";
import { createHash, hash } from "node:crypto";

const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

const METHODS_WITH_BODY = ["POST", "PUT", "PATCH", "QUERY"];

export const handler: CloudFrontRequestHandler = async (event) => {
  const request = event.Records[0].cf.request;

  // Only process requests that need SHA256 signing (methods with body)
  if (!METHODS_WITH_BODY.includes(request.method)) {
    return request;
  }

  // Check if body was truncated (exceeds 1MB Lambda@Edge limit)
  if (request.body?.inputTruncated) {
    return {
      status: "413",
      statusDescription: "Payload Too Large",
      headers: {
        "content-type": [{ key: "Content-Type", value: "application/json" }],
      },
      body: JSON.stringify({
        error:
          "Request body exceeds 1MB Lambda@Edge limit. Use presigned S3 URLs for large uploads.",
      }),
    };
  }

  const data = request.body?.data;
  const digest = !data
    ? EMPTY_SHA256
    : request.body?.encoding === "base64"
      ? createHash("sha256").update(data, "base64").digest("hex")
      : hash("sha256", data, "hex");

  request.headers["x-amz-content-sha256"] = [
    {
      key: "x-amz-content-sha256",
      value: digest,
    },
  ];

  return request;
};
