import { useEffect, useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import Form from "react-bootstrap/Form";
import Button from "./components/Button";
import BrandNavbar from "./components/BrandNavbar";
import ConstructPanel from "./components/ConstructPanel";
import "./App.scss";

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
        (e.message === "Cannot read property 'subscribeToMore' of undefined" ||
          e.message ===
            "undefined is not an object (evaluating '_this.currentObservable.subscribeToMore')")
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
      <ConstructPanel type="Auth" name={name}>
        <span class="text-muted">Coming soon</span>
      </ConstructPanel>
    );
  }

  function renderApi({ name, props }) {
    const { httpApiEndpoint, routes } = props;
    return (
      <ConstructPanel type="Api" name={name}>
        <p>{httpApiEndpoint}</p>
        <table>
          {Object.values(routes).map((per) =>
            renderApiRoute(httpApiEndpoint, per)
          )}
        </table>
      </ConstructPanel>
    );
  }

  function renderApiGatewayV1Api({ name, props }) {
    const { restApiEndpoint, routes } = props;
    return (
      <ConstructPanel type="ApiGatewayV1Api" name={name}>
        <p>{restApiEndpoint}</p>
        <table>
          {Object.values(routes).map((per) =>
            renderApiRoute(restApiEndpoint, per)
          )}
        </table>
      </ConstructPanel>
    );
  }

  function renderApolloApi({ name, props }) {
    const { httpApiEndpoint } = props;
    return (
      <ConstructPanel type="ApolloApi" name={name}>
        <span>{httpApiEndpoint}</span>
      </ConstructPanel>
    );
  }

  function renderAppSyncApi({ name, props }) {
    const { graphqlApiEndpoint, realtimeApiEndpoint } = props;
    return (
      <ConstructPanel type="AppSyncApi" name={name}>
        <table>
          <tr>
            <td>GraphQL</td>
            <td>{graphqlApiEndpoint}</td>
          </tr>
          <tr>
            <td>WebSocket</td>
            <td>{realtimeApiEndpoint}</td>
          </tr>
        </table>
      </ConstructPanel>
    );
  }

  function renderWebSocketApi({ name, props }) {
    const { httpApiEndpoint, routes } = props;
    return (
      <ConstructPanel type="WebSocketApi" name={name}>
        <p>{httpApiEndpoint}</p>
        <table>
          {routes.map((per) => (
            <tr>
              <td>{per}</td>
            </tr>
          ))}
        </table>
      </ConstructPanel>
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
      <ConstructPanel type="Queue" name={name}>
        <p>{props.queueUrl}</p>
        <Form.Control
          rows={4}
          as="textarea"
          onChange={(e) => setPayload(e.target.value)}
          value={payload}
        ></Form.Control>
        <br />
        <Button
          onClick={() =>
            onTrigger({
              type,
              queueUrl: props.queueUrl,
              payload,
            })
          }
        >
          Send message
        </Button>
      </ConstructPanel>
    );
  }

  function renderTopic({ name, type, props }) {
    return (
      <ConstructPanel type="Topic" name={name}>
        <p>{props.topicArn}</p>
        <Form.Control
          rows={4}
          as="textarea"
          onChange={(e) => setPayload(e.target.value)}
          value={payload}
        ></Form.Control>
        <br />
        <Button
          onClick={() =>
            onTrigger({
              type,
              topicArn: props.topicArn,
              payload,
            })
          }
        >
          Publish message
        </Button>
      </ConstructPanel>
    );
  }

  function renderCron({ name, type, props }) {
    return (
      <ConstructPanel type="Cron" name={name}>
        <Button
          onClick={() =>
            onTrigger({
              type,
              functionName: props.functionName,
            })
          }
        >
          Trigger now
        </Button>
      </ConstructPanel>
    );
  }

  function renderBucket({ name, props }) {
    return (
      <ConstructPanel type="Bucket" name={name}>
        <span>{props.bucketName}</span>
      </ConstructPanel>
    );
  }

  function renderTable({ name, props }) {
    return (
      <ConstructPanel type="Table" name={name}>
        <span>{props.tableName}</span>
      </ConstructPanel>
    );
  }

  function renderKinesisStream({ name, type, props }) {
    return (
      <ConstructPanel type="KinesisStream" name={name}>
        <p>{props.streamName}</p>
        <Form.Control
          rows={4}
          as="textarea"
          onChange={(e) => setPayload(e.target.value)}
          value={payload}
        ></Form.Control>
        <br />
        <Button
          onClick={() =>
            onTrigger({
              type,
              streamName: props.streamName,
              payload,
            })
          }
        >
          Put record
        </Button>
      </ConstructPanel>
    );
  }

  function renderStaticSite({ name, props }) {
    return (
      <ConstructPanel type="StaticSite" name={name}>
        <span>{props.endpoint}</span>
      </ConstructPanel>
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
      <BrandNavbar />
      <div className="panels">
        <div>
          {constructsError && <p>Failed to Load!</p>}
          {loadingConstructs && <p>Loading...</p>}
          {constructs && constructs.map(renderConstruct)}
        </div>
        <div>{renderLogs()}</div>
      </div>
    </div>
  );
}
