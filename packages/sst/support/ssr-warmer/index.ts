import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import type { Context } from "aws-lambda";

const lambda = new LambdaClient({});
const warmParams = JSON.parse(process.env.WARM_PARAMS!) as { concurrency: number, function: string }[];

function generateUniqueId() {
  return Math.random().toString(36).slice(2, 8);
}

export interface WarmerEvent {
  type: "warmer";
  warmerId: string;
  index: number;
  concurrency: number;
  delay: number;
}

export interface WarmerResponse {
  serverId: string;
}

export async function handler(_event: any, context: Context) {
  const warmerId = `warmer-${generateUniqueId()}`;

  for (const warmParam of warmParams) {
    const { concurrency: CONCURRENCY, function: FUNCTION_NAME } = warmParam;


    console.log({
      event: "warmer invoked",
      functionName: FUNCTION_NAME,
      concurrency: CONCURRENCY,
      warmerId,
    });

    // Warm
    const ret = await Promise.all(
      Array.from({ length: CONCURRENCY }, (_v, i) => i).map((i) => {
        try {
          return lambda.send(
            new InvokeCommand({
              FunctionName: FUNCTION_NAME,
              InvocationType: "RequestResponse",
              Payload: JSON.stringify({
                type: "warmer",
                warmerId,
                index: i,
                concurrency: CONCURRENCY,
                delay: 75,
              } satisfies WarmerEvent),
            })
          );
        } catch (e) {
          console.error(`failed to warm up #${i}`, e);
          // ignore error
        }
      })
    );

    // Print status
    const warmedServerIds: string[] = [];
    ret.forEach((r, i) => {
      if (r?.StatusCode !== 200 || !r?.Payload) {
        console.error(`failed to warm up #${i}:`, r?.Payload?.toString());
        return;
      }
      const payloadString = r.Payload.transformToString();
      if (payloadString) {
        const payload = JSON.parse(
          r.Payload.transformToString()
        ) as WarmerResponse;
        warmedServerIds.push(payload.serverId);
      } else {
        warmedServerIds.push("unknown");
      }
    });
    console.log({
      event: "warmer result",
      sent: CONCURRENCY,
      name: FUNCTION_NAME,
      success: warmedServerIds.length,
      uniqueServersWarmed: [...new Set(warmedServerIds)].length,
    });
  }
}
