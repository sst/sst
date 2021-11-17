const AWS = require("aws-sdk");
AWS.config.logger = console;
const ddb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

exports.main = async function (event) {
  console.log(event);

  const eventBody = JSON.parse(event.body);

  console.log("Event action:", eventBody.action);

  switch (eventBody.action) {
    case "client.register":
      await onClientRegister(event);
      break;
    case "client.lambdaResponse":
      await onClientLambdaResponse(event, eventBody);
      break;
    case "stub.lambdaRequest":
      await onStubLambdaRequest(event, eventBody);
      break;
    case "register": {
      const clientConnectionId = await getClientConnectionId();
      await postToConnection(
        event,
        JSON.stringify(eventBody),
        clientConnectionId
      );
    }
  }

  return { statusCode: 200, body: "Data sent." };
};

async function onClientRegister(event) {
  // store client in DB
  console.log("Registering new client.");
  const clientConnectionId = event.requestContext.connectionId;
  const oldConnectionId = await setClientConnectionId(clientConnectionId);

  // notify new client is registered
  console.log("Notifying client connected.");
  await postToConnection(
    event,
    JSON.stringify({
      action: "server.clientRegistered",
      clientConnectionId,
    }),
    clientConnectionId
  );

  // notify old client is replaced by the newer client
  if (oldConnectionId) {
    console.log("Existing client found. Notify existing client to disconnect.");
    try {
      await postToConnection(
        event,
        JSON.stringify({ action: "server.clientDisconnectedDueToNewClient" }),
        oldConnectionId
      );
    } catch (e) {
      // empty
    }
  }
}

async function onClientLambdaResponse(event, eventBody) {
  // send response to stub
  try {
    console.log("Sending response to stub.");
    await postToConnection(event, event.body, eventBody.stubConnectionId);
  } catch (e) {
    console.error(e);

    console.log("Notifying client response failed to send to stub.");
    const clientConnectionId = event.requestContext.connectionId;
    const action =
      e.statusCode === 410
        ? "server.failedToSendResponseDueToStubDisconnected"
        : "server.failedToSendResponseDueToUnknown";
    await postToConnection(
      event,
      JSON.stringify({
        action,
        debugRequestId: eventBody.debugRequestId,
      }),
      clientConnectionId
    );

    throw e;
  }
}

async function onStubLambdaRequest(event, eventBody) {
  const stubConnectionId = event.requestContext.connectionId;

  // get connected client
  console.log("Getting connected client id.");
  const clientConnectionId = await getClientConnectionId();

  // send request to client
  if (clientConnectionId) {
    console.log("Sending request to client.");
    try {
      await postToConnection(
        event,
        JSON.stringify({ ...eventBody, stubConnectionId }),
        clientConnectionId
      );
    } catch (e) {
      console.error(e);

      console.log("Notifying stub request failed to send to client.");
      const action =
        e.statusCode === 410
          ? "server.failedToSendRequestDueToClientNotConnected"
          : "server.failedToSendRequestDueToUnknown";
      await postToConnection(
        event,
        JSON.stringify({ action }),
        stubConnectionId
      );
    }
  } else {
    // handle no connected client
    console.log("Notifying stub no connected client.");
    await postToConnection(
      event,
      JSON.stringify({
        action: "server.failedToSendRequestDueToClientNotConnected",
      }),
      stubConnectionId
    );
  }
}

///////////////////////////////
// Util Functions
///////////////////////////////

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

async function postToConnection(event, data, connectionId) {
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint: `${event.requestContext.domainName}/${event.requestContext.stage}`,
  });

  await apigwManagementApi
    .postToConnection({
      ConnectionId: connectionId,
      Data: data,
    })
    .promise();
}
