import AWS from "aws-sdk";

const sqs = new AWS.SQS();
const sns = new AWS.SNS();

export const cron1 = async (event) => {
  console.log("=== cron1 called ===");
  console.log(event);
  await sns
    .publish({
      TopicArn: process.env.topicArn,
      Message: JSON.stringify({ hello: "sns" }),
      MessageStructure: "string",
    })
    .promise();
};
export const cron2 = async (event) => {
  console.log("=== cron2 called ===");
  console.log(event);
  await sqs
    .sendMessage({
      QueueUrl: process.env.queueUrl,
      MessageBody: JSON.stringify({ hello: "sqs" }),
    })
    .promise();
};
export const snsSubscriber = async (event) => {
  console.log("=== snsSubscriber called ===");
  console.log(event);
};
export const sqsConsumer = async (event) => {
  console.log("=== sqsConsumer called ===");
  console.log(event);
};
