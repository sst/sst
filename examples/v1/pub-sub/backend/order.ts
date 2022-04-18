import AWS from "aws-sdk";

const sns = new AWS.SNS();

export async function main() {
  // Publish a message to topic
  await sns
    .publish({
      // Get the topic from the environment variable
      TopicArn: process.env.topicArn,
      Message: JSON.stringify({ ordered: true }),
      MessageStructure: "string",
    })
    .promise();

  console.log("Order confirmed!");

  return {
    statusCode: 200,
    body: JSON.stringify({ status: "successful" }),
  };
}
