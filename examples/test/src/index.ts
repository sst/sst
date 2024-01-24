import { Resource } from "sst";

export async function handler() {
  return {
    statusCode: 200,
    body: Resource.MyQueue.url,
  };
}
