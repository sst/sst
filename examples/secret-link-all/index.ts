import { Resource } from "sst";

export function handler() {
  console.log(`MyBucket: ${Resource.MyBucket.name}`);
  console.log(`Secret1: ${Resource.Secret1.value}`);
  console.log(`Secret2: ${Resource.Secret2.value}`);

  return {
    status: 200,
    body: "Hello World!"
  };
}
