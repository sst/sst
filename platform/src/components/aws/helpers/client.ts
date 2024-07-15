import { StandardRetryStrategy } from "@aws-sdk/middleware-retry";
export type {} from "@smithy/types";

type ClientOptions = {
  region?: string;
  retrableErrors?: string[];
};

class AwsError extends Error {
  requestID?: string;
  statusCode?: number;
}

const printNoInternet = (() => {
  let lastPrinted = 0;
  return () => {
    const now = Date.now();
    if (now - lastPrinted > 5000) {
      console.log("Waiting for internet connection...");
      lastPrinted = now;
    }
  };
})();

export const awsFetch = async (
  service: "s3" | "cloudfront" | "lambda" | "rds-data" | "route53",
  uri: string,
  request: RequestInit,
  opts: {
    region?: string;
    retrableErrors?: string[];
  } = {},
) => {
  const sourcePath = "aws4fetch";
  const { AwsClient } = await import(sourcePath);
  const region = opts?.region ?? process.env.SST_AWS_REGION ?? "us-east-1";
  const client = new AwsClient({
    ...(process.env.SST_AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.SST_AWS_ACCESS_KEY_ID,
          sessionToken: process.env.SST_AWS_SESSION_TOKEN,
          secretAccessKey: process.env.SST_AWS_SECRET_ACCESS_KEY!,
        }
      : {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          sessionToken: process.env.AWS_SESSION_TOKEN,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        }),
    retries: 0,
  });
  const endpoint = uri.startsWith("https://")
    ? uri
    : {
        cloudfront: `https://cloudfront.amazonaws.com/2020-05-31`,
        lambda: `https://lambda.${region}.amazonaws.com/2015-03-31`,
        "rds-data": `https://rds-data.${region}.amazonaws.com`,
        route53: `https://route53.amazonaws.com/2013-04-01`,
        s3: `placeholder`,
      }[service] + uri;

  return fetch(endpoint, request);

  async function fetch(url: string, request: RequestInit, attempts = 0) {
    // enforce JSON response
    request.headers = {
      ...request.headers,
      Accept: "application/json",
    };

    try {
      const response = await client.fetch(url, request);

      // success
      if (response.status === 200 || response.status === 201) {
        if (response.headers.get("content-length") === "0") return;
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch (e) {
          throw new AwsError(`Failed to parse JSON response: ${text}`);
        }
      }

      // error
      const error = new AwsError();
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        error.name = json.Error?.Code;
        error.message = json.Error?.Message ?? json.message ?? text;
      } catch (e) {
        error.message = text;
      }
      error.name = error.name ?? response.headers.get("x-amzn-ErrorType");
      error.requestID = response.headers.get("x-amzn-RequestId");
      error.statusCode = response.status;
      throw error;
    } catch (e: any) {
      let isRetryable = false;

      // no internet connection
      if (e.cause?.code === "ENOTFOUND") {
        printNoInternet();
        isRetryable = true;
      }

      // AWS throttling errors => retry
      if (
        [
          "ThrottlingException",
          "Throttling",
          "TooManyRequestsException",
          "OperationAbortedException",
          "TimeoutError",
          "NetworkingError",
          ...(opts?.retrableErrors ?? []),
        ].includes(e.name)
      ) {
        isRetryable = true;
      }

      if (!isRetryable) throw e;

      // retry
      await new Promise((resolve) =>
        setTimeout(resolve, 1.5 ** attempts * 100 * Math.random()),
      );
      return await fetch(url, request, attempts + 1);
    }
  }
};

export const useClient = <C extends any>(
  client: new (config: any) => C,
  opts?: ClientOptions,
) => {
  return new client({
    region: opts?.region ?? process.env.SST_AWS_REGION,
    credentials: process.env.SST_AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.SST_AWS_ACCESS_KEY_ID,
          sessionToken: process.env.SST_AWS_SESSION_TOKEN,
          secretAccessKey: process.env.SST_AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
    retryStrategy: new StandardRetryStrategy(async () => 10000, {
      retryDecider: (e: any) => {
        // Handle no internet connection => retry
        if (e.code === "ENOTFOUND") {
          printNoInternet();
          return true;
        }

        // Handle throttling errors => retry
        if (
          [
            "ThrottlingException",
            "Throttling",
            "TooManyRequestsException",
            "OperationAbortedException",
            "TimeoutError",
            "NetworkingError",
            ...(opts?.retrableErrors ?? []),
          ].includes(e.name)
        ) {
          return true;
        }

        return false;
      },
      delayDecider: (_, attempts) => {
        return Math.min(1.5 ** attempts * 100, 5000);
      },
      // AWS SDK v3 has an idea of "retry tokens" which are used to
      // prevent multiple retries from happening at the same time.
      // This is a workaround to disable that.
      retryQuota: {
        hasRetryTokens: () => true,
        releaseRetryTokens: () => {},
        retrieveRetryTokens: () => 1,
      },
    }),
  });
};
