import { Resource } from "sst";

export const handler = async (evt) => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        evt,
        resources: { MyVectorDB: Resource.MyVectorDB },
      },
      null,
      2
    ),
  };
};
