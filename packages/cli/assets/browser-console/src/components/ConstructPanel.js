import { useState } from "react";
import Form from "react-bootstrap/Form";
import Button from "./Button";
import KeyValueItem from "./KeyValueItem";
import CollapsiblePanel from "./CollapsiblePanel";
import "./ConstructPanel.scss";

const defaultPayload = JSON.stringify({ data: "placeholder" }, null, 2);

export default function ConstructPanel({
  construct,
  onTrigger,
  ...props
}) {
  const [payload, setPayload] = useState(defaultPayload);

  //////////////
  // Render
  //////////////

  function renderConstruct() {
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
      case "EventBus":
        return renderEventBus(construct);
      case "KinesisStream":
        return renderKinesisStream(construct);
      case "StaticSite":
        return renderStaticSite(construct);
      default:
        return;
    }
  }

  function renderAuth({ name, props }) {
    const { identityPoolId } = props;
    return (
      <CollapsiblePanel type="Auth" name={name}>
        <KeyValueItem name="Identity Pool ID" value={identityPoolId} />
      </CollapsiblePanel>
    );
  }

  function renderApi({ name, props }) {
    const { httpApiEndpoint, customDomainUrl, routes } = props;
    return (
      <CollapsiblePanel type="Api" name={name}>
        <KeyValueItem name="URL" value={httpApiEndpoint} />
        { customDomainUrl &&
          <KeyValueItem name="Custom Domain URL" value={customDomainUrl} /> }
        <table>
          <tbody>
            {Object.values(routes).map((per) =>
              renderApiRoute(customDomainUrl || httpApiEndpoint, per)
            )}
          </tbody>
        </table>
      </CollapsiblePanel>
    );
  }

  function renderApiGatewayV1Api({ name, props }) {
    const { restApiEndpoint, customDomainUrl, routes } = props;
    return (
      <CollapsiblePanel type="ApiGatewayV1Api" name={name}>
        <KeyValueItem name="URL" value={restApiEndpoint} />
        { customDomainUrl &&
          <KeyValueItem name="Custom Domain URL" value={customDomainUrl} /> }
        <table>
          <tbody>
            {Object.values(routes).map((per) =>
              renderApiRoute(customDomainUrl || restApiEndpoint, per)
            )}
          </tbody>
        </table>
      </CollapsiblePanel>
    );
  }

  function renderApolloApi({ name, props }) {
    const { httpApiEndpoint, customDomainUrl } = props;
    return (
      <CollapsiblePanel type="ApolloApi" name={name}>
        <KeyValueItem name="URL" value={httpApiEndpoint} />
        { customDomainUrl &&
          <KeyValueItem name="Custom Domain URL" value={customDomainUrl} /> }
      </CollapsiblePanel>
    );
  }

  function renderAppSyncApi({ name, props }) {
    const { graphqlApiEndpoint, realtimeApiEndpoint } = props;
    return (
      <CollapsiblePanel type="AppSyncApi" name={name}>
        <KeyValueItem name="GraphQL URL" value={graphqlApiEndpoint} />
        <KeyValueItem name="WebSocket URL" value={realtimeApiEndpoint} />
      </CollapsiblePanel>
    );
  }

  function renderWebSocketApi({ name, props }) {
    const { httpApiEndpoint, customDomainUrl, routes } = props;
    return (
      <CollapsiblePanel type="WebSocketApi" name={name}>
        <KeyValueItem name="URL" value={httpApiEndpoint} />
        { customDomainUrl &&
          <KeyValueItem name="Custom Domain URL" value={customDomainUrl} /> }
        <table>
          <tbody>
            {routes.map((per) => (
              <tr>
                <td>{per}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CollapsiblePanel>
    );
  }

  function renderApiRoute(endpoint, { method, path }) {
    let routeKey, routePath;
    if (path === "$default") {
      routeKey = path;
      routePath = `${endpoint}/${path}`;
    }
    else {
      routeKey = `${method} ${path}`;
      routePath = `${endpoint}${path}`;
    }

    return (
      <tr>
        <td>{routeKey}</td>
        <td>
          <a href={routePath} target="_blank" rel="noreferrer">
            {routePath}
          </a>
        </td>
      </tr>
    );
  }

  function renderQueue({ name, type, props }) {
    return (
      <CollapsiblePanel type="Queue" name={name}>
        <KeyValueItem name="Queue URL" value={props.queueUrl} />
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
      </CollapsiblePanel>
    );
  }

  function renderTopic({ name, type, props }) {
    return (
      <CollapsiblePanel type="Topic" name={name}>
        <KeyValueItem name="Topic ARN" value={props.topicArn} />
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
      </CollapsiblePanel>
    );
  }

  function renderCron({ name, type, props }) {
    return (
      <CollapsiblePanel type="Cron" name={name}>
        <KeyValueItem name="Schedule" value={props.schedule} canCopy={false} />
        <Button
          onClick={() =>
            onTrigger({
              type,
              ruleName: props.ruleName,
              functionName: props.functionName,
            })
          }
        >
          Trigger now
        </Button>
      </CollapsiblePanel>
    );
  }

  function renderBucket({ name, props }) {
    return (
      <CollapsiblePanel type="Bucket" name={name}>
        <KeyValueItem name="Bucket Name" value={props.bucketName} />
      </CollapsiblePanel>
    );
  }

  function renderTable({ name, props }) {
    return (
      <CollapsiblePanel type="Table" name={name}>
        <KeyValueItem name="Table Name" value={props.tableName} />
      </CollapsiblePanel>
    );
  }

  function renderEventBus({ name, props }) {
    return (
      <CollapsiblePanel type="EventBus" name={name}>
        <KeyValueItem name="EventBus Name" value={props.eventBusName} />
      </CollapsiblePanel>
    );
  }

  function renderKinesisStream({ name, type, props }) {
    return (
      <CollapsiblePanel type="KinesisStream" name={name}>
        <KeyValueItem name="Stream Name" value={props.streamName} />
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
      </CollapsiblePanel>
    );
  }

  function renderStaticSite({ name, props }) {
    return (
      <CollapsiblePanel type="StaticSite" name={name}>
        <KeyValueItem name="URL" value={props.endpoint} />
      </CollapsiblePanel>
    );
  }

  return (
    <div className="ConstructPanel">
      { renderConstruct() }
    </div>
  );
}
