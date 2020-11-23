const AWS = require("aws-sdk");
AWS.config.logger = console;
const ddb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

// TODO
// - handle re-use websocket connection
// - handle client/channel's connectionId not connected
// - handle connection closed
// - get stub connection id needs to be strong consistent read
exports.main = async function (event) {
  console.log(event);
  const eventData = JSON.parse(event.body);
  console.log(eventData);

  if (eventData.action === "registerClient") {
    // register client
    await ddb
      .put({
        TableName: process.env.TABLE_NAME,
        Item: {
          channel: "client",
          connectionId: event.requestContext.connectionId,
        },
      })
      .promise();
  } else if (eventData.action === "newRequest") {
    // send request to client
    const ret = await ddb
      .get({
        TableName: process.env.TABLE_NAME,
        Key: { channel: "client" },
      })
      .promise();
    const connectionId = ret.Item.connectionId;
    await postToConnection(
      JSON.stringify({
        ...eventData,
        stubConnectionId: event.requestContext.connectionId,
      }),
      connectionId
    );
  } else if (eventData.action === "newResponse") {
    await postToConnection(event.body, eventData.stubConnectionId);
  }

  async function postToConnection(data, connectionId) {
    // Post to connections
    const apigwManagementApi = new AWS.ApiGatewayManagementApi({
      apiVersion: "2018-11-29",
      endpoint:
        event.requestContext.domainName + "/" + event.requestContext.stage,
    });

    try {
      await apigwManagementApi
        .postToConnection({
          ConnectionId: connectionId,
          Data: data,
        })
        .promise();
    } catch (e) {
      if (e.statusCode === 410) {
        console.log(`Found stale connection, deleting ${connectionId}`);
        await ddb
          .delete({
            TableName: process.env.TABLE_NAME,
            Key: { connectionId },
          })
          .promise();
      } else {
        throw e;
      }
    }
  }

  return { statusCode: 200, body: "Data sent." };
};
