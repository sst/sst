import { Resource } from "sst";

export const handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ data: Resource.MyBucket.bucketName }, null, 2),
  };
};
