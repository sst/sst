// More examples here on how to parse responses from Cloudflare API
// https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/src/routes.ts

const CLOUDFLARE_API_BASE_URL =
  process.env.CLOUDFLARE_API_BASE_URL ?? "https://api.cloudflare.com/client/v4";
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

export interface FetchError {
  code: number;
  message: string;
  error_chain?: FetchError[];
}

export interface FetchResult<ResponseType = unknown> {
  success: boolean;
  result: ResponseType;
  errors: FetchError[];
  messages?: string[];
  result_info?: unknown;
}

export async function cfFetch<ResponseType>(
  resource: string,
  init: RequestInit = {}
): Promise<ResponseType> {
  const ret = await fetch(`${CLOUDFLARE_API_BASE_URL}${resource}`, {
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    ...init,
  });
  const json = (await ret.json()) as FetchResult<ResponseType>;
  // ie.
  // {
  //   "result": {
  //     "subdomain": "wangfanjie"
  //   },
  //   "success": true,
  //   "errors": [],
  //   "messages": []
  // }
  if (json.success) {
    return json.result;
  }

  const error = new Error(
    `A request to the Cloudflare API (${resource}) failed.`
  );
  // @ts-expect-error attach the errors to the error object
  error.errors = json.errors;
  // @ts-expect-error attach the messages to the error object
  error.messages = json.messages;
  throw error;
}
