const AWS = require("aws-sdk");
const sns = new AWS.SNS();

exports.handler = async function (event) {
  console.log("Calling from inside the api function");

  await sns
    .publish({
      TopicArn: process.env.TOPIC_ARN,
      Message: JSON.stringify({ abc: 123 }),
      MessageStructure: "string",
    })
    .promise();

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: "New World with event: " + JSON.stringify(event),
  };
};
