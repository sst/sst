import { Resource } from "sst";
import { render } from "jsx-email";
import { Template } from "./templates/email";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const client = new SESv2Client();

export const handler = async () => {
  await client.send(
    new SendEmailCommand({
      FromEmailAddress: Resource.MyEmail.sender,
      Destination: {
        ToAddresses: [Resource.MyEmail.sender],
      },
      Content: {
        Simple: {
          Subject: {
            Data: "Hello World!",
          },
          Body: {
            Html: {
              Data: await render(Template({
                email: "spongebob@example.com",
                name: "Spongebob Squarepants"
              })),
            },
          },
        },
      },
    })
  );

  return {
    statusCode: 200,
    body: "Sent!"
  };
};
