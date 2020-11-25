setTimeout(() => console.log("still here"), 3000);

const AWS = require("aws-sdk");
AWS.config.logger = console;
const sns = new AWS.SNS();

exports.handler = async function (event, context, callback) {
  context.callbackWaitsForEmptyEventLoop = false;

  console.log("Calling from inside the api function");

  await sns
    .publish({
      TopicArn: process.env.TOPIC_ARN,
      Message: JSON.stringify({ abc: 123 }),
      MessageStructure: "string",
    })
    .promise();

  setTimeout(() => {
    callback(null, {
      statusCode: 200,
      headers: { "Content-Type": "text/plain" },
      body: "New World with event: " + JSON.stringify(event),
    });
  }, 2000);
};
