import {
  IoTDataPlaneClient,
  PublishCommand,
} from "@aws-sdk/client-iot-data-plane";
const data = new IoTDataPlaneClient({});

export const handler = async () => {
  await data.send(
    new PublishCommand({
      payload: Buffer.from(
        JSON.stringify({ message: "A greeting from Lambda" })
      ),
      topic: process.env.SST_TOPIC,
    })
  );
  return {
    statusCode: 200,
    body: "Sent",
  };
};
