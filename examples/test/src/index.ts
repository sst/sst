/// <reference path="../.sst/types.generated.ts" />

import { Resource } from "sst";

export function handler() {
  return {
    statusCode: 200,
    body: JSON.stringify(Resource.StripeKey),
  };
}
