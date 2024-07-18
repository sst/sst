import { Resource } from "sst";

export async function handler() {
  console.log("Hello World!");
  console.log("topic", Resource.Topic.arn);
  console.log(
    "existingResources",
    Resource.ExistingResources.queueName,
    Resource.ExistingResources.bucketName,
  );
}
