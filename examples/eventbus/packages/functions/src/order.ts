import AWS from "aws-sdk";
import { EventBus } from "sst/node/event-bus";

const client = new AWS.EventBridge();

export async function handler() {
  client
    .putEvents({
      Entries: [
        {
          EventBusName: EventBus.Ordered.eventBusName,
          Source: "myevent",
          DetailType: "Order",
          Detail: JSON.stringify({
            id: "123",
            name: "My order",
            items: [
              {
                id: "1",
                name: "My item",
                price: 10,
              },
            ],
          }),
        },
      ],
    })
    .promise()
    .catch((e) => {
      console.log(e);
    });

  console.log("Order confirmed!");

  return {
    statusCode: 200,
    body: JSON.stringify({ status: "successful" }),
  };
}
