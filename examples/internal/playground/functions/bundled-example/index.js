import { Resource } from "sst";

export const handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ event, resources: Resource.MyBucket }, null, 2),
  };
};
