import { Resource } from "sst";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
const client = new SESv2Client();

export const handler = async () => {
  await client.send(
    new SendEmailCommand({
      FromEmailAddress: Resource.EmailAddress.sender,
      Destination: {
        ToAddresses: [Resource.EmailAddress.sender],
      },
      Content: {
        Simple: {
          Subject: {
            Data: "Hello, world!",
          },
          Body: {
            Text: {
              Data: "This is the message body.",
            },
          },
        },
      },
    })
  );

  return {
    statusCode: 200,

    body: JSON.stringify({ status: "sent" }, null, 2),
  };
};
