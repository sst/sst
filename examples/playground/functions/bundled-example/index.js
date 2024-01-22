import { Resource } from "sst";

export const handler = async (evt) => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        evt,
        resources: Resource.MyBucket,
      },
      null,
      2
    ),
  };
};
