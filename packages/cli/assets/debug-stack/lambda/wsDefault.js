const AWS = require("aws-sdk");
AWS.config.logger = console;
const ddb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

exports.main = async function (event) {
  console.log(event);
  const eventData = JSON.parse(event.body);

  if (eventData.action === "connectClient") {
    // register client
    const clientConnectionId = event.requestContext.connectionId;
    const oldConnectionId = await setClientConnectionId(clientConnectionId);
    await postToConnection(
      JSON.stringify({
        action: "clientConnected",
        clientConnectionId,
      }),
      clientConnectionId
    );

    // notify old client is replaced by the newer client
    if (oldConnectionId) {
      try {
        await postToConnection(
          JSON.stringify({ action: "clientDisconnectedDueToNewClient" }),
          oldConnectionId
        );
      } catch (e) {
        console.log(e);
      }
    }
  } else if (eventData.action === "newRequest") {
    // send request to client
    const stubConnectionId = event.requestContext.connectionId;
    const clientConnectionId = await getClientConnectionId();
    if (clientConnectionId) {
      try {
        await postToConnection(
          JSON.stringify({ ...eventData, stubConnectionId }),
          clientConnectionId
        );
      } catch (e) {
        // handle failed to send
        console.log(e);
        const action =
          e.statusCode === 410
            ? "failedToSendRequestDueToClientNotConnected"
            : "failedToSendRequestDueToUnknown";
        await postToConnection(JSON.stringify({ action }), stubConnectionId);
      }
    } else {
      // handle client connection not exist
      await postToConnection(
        JSON.stringify({
          action: "failedToSendRequestDueToClientNotConnected",
        }),
        stubConnectionId
      );
    }
  } else if (eventData.action === "newResponse") {
    try {
      await postToConnection(event.body, eventData.stubConnectionId);
    } catch (e) {
      const clientConnectionId = event.requestContext.connectionId;
      const action =
        e.statusCode === 410
          ? "failedToSendResponseDueToStubDisconnected"
          : "failedToSendResponseDueToUnknown";
      await postToConnection(
        JSON.stringify({
          action,
          debugRequestId: eventData.debugRequestId,
        }),
        clientConnectionId
      );
    }
  }

  async function getClientConnectionId() {
    const ret = await ddb
      .get({
        TableName: process.env.TABLE_NAME,
        Key: { pk: "client" },
        ConsistentRead: true,
      })
      .promise();
    return ret.Item && ret.Item.connectionId;
  }

  async function setClientConnectionId(connectionId) {
    const ret = await ddb
      .update({
        TableName: process.env.TABLE_NAME,
        Key: { pk: "client" },
        UpdateExpression: "SET connectionId = :connectionId",
        ExpressionAttributeValues: {
          ":connectionId": connectionId,
        },
        ReturnValues: "UPDATED_OLD",
      })
      .promise();
    return ret.Attributes && ret.Attributes.connectionId;
  }

  async function postToConnection(data, connectionId) {
    const apigwManagementApi = new AWS.ApiGatewayManagementApi({
      apiVersion: "2018-11-29",
      endpoint:
        event.requestContext.domainName + "/" + event.requestContext.stage,
    });

    await apigwManagementApi
      .postToConnection({
        ConnectionId: connectionId,
        Data: data,
      })
      .promise();
  }

  return { statusCode: 200, body: "Data sent." };
};
