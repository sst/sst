import { Resource } from "sst";

export async function handler() {
  console.log(Resource.MyApi);
  return {
    statusCode: 200,
    body: "Hello, World!",
  };
}
