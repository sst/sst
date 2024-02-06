import { Resource } from "sst";

export async function handler() {
  const body = "a".repeat(1024 * 100);
  return {
    statusCode: 200,
    body,
  };
}
