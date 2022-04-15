import AWS from "aws-sdk";

const client = new AWS.EventBridge();

export async function handler() {
  client
    .putEvents({
      Entries: [
        {
          EventBusName: process.env.busName,
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
