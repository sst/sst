import { Resource } from "sst";

export async function handler() {
  const body = "a".repeat(1024 * 1024);
  return {
    statusCode: 200,
    body,
  };
}
