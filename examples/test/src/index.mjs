import { Resource } from "sst";

export async function handler() {
  console.log("hello");
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/plain",
    },
    body: Resource.Bucket.bucketName,
  };
}
