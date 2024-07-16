import { KinesisClient, PutRecordsCommand } from "@aws-sdk/client-kinesis";
import { Resource } from "sst";

export const handler = async (event) => {
  const client = new KinesisClient();

  await client.send(
    new PutRecordsCommand({
      Records: [
        {
          Data: JSON.stringify({ type: "foo" }),
          PartitionKey: "1",
        },
        {
          Data: JSON.stringify({ type: "bar" }),
          PartitionKey: "1",
        },
      ],
      StreamName: Resource.MyStream.name,
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ status: "sent" }, null, 2),
  };
};
