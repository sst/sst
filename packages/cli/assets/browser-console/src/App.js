import { useEffect, useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import Button from "react-bootstrap/Button";
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";

import "./App.css";

const defaultPayload = JSON.stringify({ data: "placeholder" }, null, 2);
const ALL_LOGS = gql`
  query AllLogs {
    getLogs {
      message
    }
  }
`;
const ALL_CONSTRUCTS = gql`
  query AllConstructs {
    getConstructs {
      error
      isLoading
      constructs
    }
  }
`;
const LOGS_SUBSCRIPTION = gql`
  subscription OnLogAdded {
    logAdded {
      message
    }
  }
`;
const CONSTRUCTS_SUBSCRIPTION = gql`
  subscription OnConstructsUpdated {
    constructsUpdated {
      error
      isLoading
      constructs
    }
  }
`;
const INVOKE = gql`
  mutation InvokeConstruct($data: String) {
    invoke(data: $data)
  }
`;

export default function App() {
  const [payload, setPayload] = useState(defaultPayload);
  const [invoke, { loading: loadingInvoke, error: invokeError }] = useMutation(
    INVOKE
  );

  // Load constructs data
  let {
    loading: loadingConstructs,
    error: constructsError,
    data: constructs,
    subscribeToMore: subscribeToConstructs,
  } = useQuery(ALL_CONSTRUCTS);

  if (constructs && constructs.getConstructs) {
    constructsError = constructs.getConstructs.error;
    loadingConstructs = constructs.getConstructs.isLoading;
    constructs = JSON.parse(constructs.getConstructs.constructs);
  }

  // Load Lambda logs
  const {
    loading: loadingLog,
    error: logError,
    data: logs,
    subscribeToMore: subscribeToLogs,
  } = useQuery(ALL_LOGS);

  useEffect(() => {
    try {
      // Subscribe to constructs data
      // note: replace initial queried data with subscribed data
      subscribeToConstructs({
        document: CONSTRUCTS_SUBSCRIPTION,
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) return prev;
          return {
            getConstructs: subscriptionData.data.constructsUpdated,
          };
        },
      });

      // Subscribe to Lambda logs
      // note: append subscribed logs to the initial queried logs
      subscribeToLogs({
        document: LOGS_SUBSCRIPTION,
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) return prev;
          return {
            // note: if initial query failed "prev.getLogs" is undefined, we need to
            //       initialize it to empty array.
            //       A sequence that can lead to this would be:
            //       1. sst start is not running
            //       2. open the browser console, and the initial query will fail
            //       3. run sst start
            //       4. invoke a request and the browser console will receive a
            //          websocket event, and this code will be invoked
            getLogs: [...(prev.getLogs || []), subscriptionData.data.logAdded],
          };
        },
      });
    } catch (e) {
      // Apollo client's subscriptions get disconnected on React hot reload, and
      // calling `subscribeToMore` fails with the error:
      //  TypeError: Cannot read property 'subscribeToMore' of undefined
      // For development purposes, we are ignoring the error so the page doesn't
      // show an error on hot reload.
      // Note the subscription connection is closed.
      // https://github.com/apollographql/apollo-client/issues/6437
      if (
        process.env.NODE_ENV === "development" &&
        e.message === "Cannot read property 'subscribeToMore' of undefined"
      ) {
        return;
      }
      throw e;
    }
  }, []);

  //////////////
  // Callbacks
  //////////////

  function onTrigger(payload) {
    invoke({ variables: { data: JSON.stringify(payload) } }).catch((e) => {
      // ignore the error, the invokeError will be set
    });
  }

  //////////////
  // Render
  //////////////

  function renderConstruct(construct) {
    switch (construct.type) {
      case "Auth":
        return renderAuth(construct);
      case "Api":
        return renderApi(construct);
      case "ApiGatewayV1Api":
        return renderApiGatewayV1Api(construct);
      case "ApolloApi":
        return renderApolloApi(construct);
      case "AppSyncApi":
        return renderAppSyncApi(construct);
      case "WebSocketApi":
        return renderWebSocketApi(construct);
      case "Queue":
        return renderQueue(construct);
      case "Topic":
        return renderTopic(construct);
      case "Cron":
        return renderCron(construct);
      case "Bucket":
        return renderBucket(construct);
      case "Table":
        return renderTable(construct);
      case "KinesisStream":
        return renderKinesisStream(construct);
      case "StaticSite":
        return renderStaticSite(construct);
      default:
        return;
    }
  }

  function renderAuth({ name }) {
    return (
      <div>
        <h3>Auth: {name}</h3>
      </div>
    );
  }

  function renderApi({ name, props }) {
    const { httpApiEndpoint, routes } = props;
    return (
      <div>
        <h3>Api: {name}</h3>
        <p>{httpApiEndpoint}</p>
        <table>
          {Object.values(routes).map((per) =>
            renderApiRoute(httpApiEndpoint, per)
          )}
        </table>
      </div>
    );
  }

  function renderApiGatewayV1Api({ name, props }) {
    const { restApiEndpoint, routes } = props;
    return (
      <div>
        <h3>ApiGatewayV1Api: {name}</h3>
        <p>{restApiEndpoint}</p>
        <table>
          {Object.values(routes).map((per) =>
            renderApiRoute(restApiEndpoint, per)
          )}
        </table>
      </div>
    );
  }

  function renderApolloApi({ name, props }) {
    const { httpApiEndpoint } = props;
    return (
      <div>
        <h3>Apollo: {name}</h3>
        <p>{httpApiEndpoint}</p>
      </div>
    );
  }

  function renderAppSyncApi({ name, props }) {
    const { graphqlApiEndpoint, realtimeApiEndpoint } = props;
    return (
      <div>
        <h3>AppSync: {name}</h3>
        <p>graphql: {graphqlApiEndpoint}</p>
        <p>realtime: {realtimeApiEndpoint}</p>
      </div>
    );
  }

  function renderWebSocketApi({ name, props }) {
    const { httpApiEndpoint, routes } = props;
    return (
      <div>
        <h3>WebSocket: {name}</h3>
        <p>{httpApiEndpoint}</p>
        <table>
          {routes.map((per) => (
            <tr>
              <td>{per}</td>
            </tr>
          ))}
        </table>
      </div>
    );
  }

  function renderApiRoute(endpoint, { method, path }) {
    return (
      <tr>
        <td>
          {method} {path}
        </td>
        <td>
          <a href={`${endpoint}${path}`} target="_blank" rel="noreferrer">
            {endpoint}
            {path}
          </a>
        </td>
      </tr>
    );
  }

  function renderQueue({ name, type, props }) {
    return (
      <div>
        <h3>Queue: {name}</h3>
        <p>{props.queueUrl}</p>
        <textarea
          rows={5}
          cols={100}
          onChange={(e) => setPayload(e.target.value)}
          value={payload}
        ></textarea>
        <button
          onClick={() =>
            onTrigger({
              type,
              queueUrl: props.queueUrl,
              payload,
            })
          }
        >
          Send message
        </button>
      </div>
    );
  }

  function renderTopic({ name, type, props }) {
    return (
      <div>
        <h3>Topic: {name}</h3>
        <p>{props.topicArn}</p>
        <textarea
          rows={5}
          cols={100}
          onChange={(e) => setPayload(e.target.value)}
          value={payload}
        ></textarea>
        <button
          onClick={() =>
            onTrigger({
              type,
              topicArn: props.topicArn,
              payload,
            })
          }
        >
          Publish message
        </button>
      </div>
    );
  }

  function renderCron({ name, type, props }) {
    return (
      <div>
        <h3>Cron: {name}</h3>
        <button
          onClick={() =>
            onTrigger({
              type,
              functionName: props.functionName,
            })
          }
        >
          Trigger now
        </button>
      </div>
    );
  }

  function renderBucket({ name, props }) {
    return (
      <div>
        <h3>Bucket: {name}</h3>
        <p>{props.bucketName}</p>
      </div>
    );
  }

  function renderTable({ name, props }) {
    return (
      <div>
        <h3>Table: {name}</h3>
        <p>{props.tableName}</p>
      </div>
    );
  }

  function renderKinesisStream({ name, type, props }) {
    return (
      <div>
        <h3>Kinesis Stream: {name}</h3>
        <p>{props.streamName}</p>
        <textarea
          rows={5}
          cols={100}
          onChange={(e) => setPayload(e.target.value)}
          value={payload}
        ></textarea>
        <button
          onClick={() =>
            onTrigger({
              type,
              streamName: props.streamName,
              payload,
            })
          }
        >
          Put record
        </button>
      </div>
    );
  }

  function renderStaticSite({ name, props }) {
    return (
      <div>
        <h3>Static Site: {name}</h3>
        <p>{props.endpoint}</p>
      </div>
    );
  }

  function renderLogs() {
    const hasLogs = logs && logs.getLogs && logs.getLogs.length > 0;
    return (
      <div>
        <h3>Logs</h3>
        {!hasLogs && <p>Listening for logs...</p>}
        {hasLogs && <pre>{logs.getLogs.map((log) => log.message)}</pre>}
      </div>
    );
  }

  return (
    <div className="App">
      <Navbar bg="dark" variant="dark">
        <Container>
          <Navbar.Brand href="#home">
            <img
              alt=""
              src="/logo.svg"
              width="30"
              height="30"
              className="d-inline-block align-top"
            />{" "}
            React Bootstrap
          </Navbar.Brand>
        </Container>
      </Navbar>
      {constructsError && <p>Failed to Load!</p>}
      {loadingConstructs && <p>Loading...</p>}
      {constructs && constructs.map(renderConstruct)}
      {renderLogs()}
    </div>
  );
}
