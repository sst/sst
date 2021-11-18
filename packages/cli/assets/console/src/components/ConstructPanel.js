import { useState } from "react";
import ApiConstructPanel from "./ApiConstructPanel";
import CronConstructPanel from "./CronConstructPanel";
import BasicConstructPanel from "./BasicConstructPanel";
import QueueConstructPanel from "./QueueConstructPanel";
import TopicConstructPanel from "./TopicConstructPanel";
import WebSocketApiConstructPanel from "./WebSocketApiConstructPanel";
import KinesisStreamConstructPanel from "./KinesisStreamConstructPanel";
import { errorHandler } from "../lib/errorLib";
import "./ConstructPanel.scss";

export default function ConstructPanel({ construct, handleTrigger, ...props }) {
  const [triggering, setTriggering] = useState(false);

  //////////////
  // Callbacks
  //////////////

  async function onTrigger(payload) {
    setTriggering(true);

    try {
      await handleTrigger(payload);
    } catch (e) {
      errorHandler(e);
    }

    setTriggering(false);
  }

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
      case "ReactStaticSite":
        return renderReactStaticSite(construct);
      case "NextjsSite":
        return renderNextjsSite(construct);
      case "Script":
        return renderScript(construct);
      default:
        return;
    }
  }

  function renderAuth({ name, props }) {
    return (
      <BasicConstructPanel
        type="Auth"
        name={name}
        keyValues={{
          "Identity Pool ID": props.identityPoolId,
        }}
      />
    );
  }

  function renderApi({ name, props }) {
    return <ApiConstructPanel type="Api" name={name} props={props} />;
  }

  function renderApiGatewayV1Api({ name, props }) {
    return (
      <ApiConstructPanel type="ApiGatewayV1Api" name={name} props={props} />
    );
  }

  function renderApolloApi({ name, props }) {
    return (
      <BasicConstructPanel
        type="ApolloApi"
        name={name}
        keyValues={{
          URL: { url: props.httpApiEndpoint },
          "Custom Domain URL": props.customDomainUrl
            ? { url: props.customDomainUrl }
            : undefined,
        }}
      />
    );
  }

  function renderAppSyncApi({ name, props }) {
    return (
      <BasicConstructPanel
        type="AppSyncApi"
        name={name}
        keyValues={{
          "GraphQL URL": { url: props.graphqlApiEndpoint },
          "WebSocket URL": { url: props.realtimeApiEndpoint },
        }}
      />
    );
  }

  function renderWebSocketApi({ name, props }) {
    return (
      <WebSocketApiConstructPanel
        type="WebSocketApi"
        name={name}
        props={props}
      />
    );
  }

  function renderQueue({ name, type, props }) {
    return (
      <QueueConstructPanel
        type={type}
        name={name}
        props={props}
        triggering={triggering}
        onTrigger={onTrigger}
      />
    );
  }

  function renderTopic({ name, type, props }) {
    return (
      <TopicConstructPanel
        type={type}
        name={name}
        props={props}
        triggering={triggering}
        onTrigger={onTrigger}
      />
    );
  }

  function renderCron({ name, type, props }) {
    return (
      <CronConstructPanel
        type={type}
        name={name}
        props={props}
        triggering={triggering}
        onTrigger={onTrigger}
      />
    );
  }

  function renderBucket({ name, props }) {
    return (
      <BasicConstructPanel
        type="Bucket"
        name={name}
        keyValues={{
          "Bucket Name": props.bucketName,
        }}
      />
    );
  }

  function renderTable({ name, props }) {
    return (
      <BasicConstructPanel
        type="Table"
        name={name}
        keyValues={{
          "Table Name": props.tableName,
        }}
      />
    );
  }

  function renderEventBus({ name, props }) {
    return (
      <BasicConstructPanel
        type="EventBus"
        name={name}
        keyValues={{
          "EventBus Name": props.eventBusName,
        }}
      />
    );
  }

  function renderKinesisStream({ name, type, props }) {
    return (
      <KinesisStreamConstructPanel
        type={type}
        name={name}
        props={props}
        triggering={triggering}
        onTrigger={onTrigger}
      />
    );
  }

  function renderStaticSite({ name, props }) {
    return (
      <BasicConstructPanel
        type="StaticSite"
        name={name}
        keyValues={{
          URL: { url: props.endpoint },
          "Custom Domain URL": props.customDomainUrl
            ? { url: props.customDomainUrl }
            : undefined,
        }}
      />
    );
  }

  function renderReactStaticSite({ name, props }) {
    return (
      <BasicConstructPanel
        type="ReactStaticSite"
        name={name}
        keyValues={{
          URL: { url: props.endpoint },
          "Custom Domain URL": props.customDomainUrl
            ? { url: props.customDomainUrl }
            : undefined,
        }}
      />
    );
  }

  function renderNextjsSite({ name, props }) {
    return (
      <BasicConstructPanel
        type="NextjsSite"
        name={name}
        keyValues={{
          URL: { url: props.endpoint },
          "Custom Domain URL": props.customDomainUrl
            ? { url: props.customDomainUrl }
            : undefined,
        }}
      />
    );
  }

  function renderScript({ name, props }) {
    return (
      <BasicConstructPanel
        type="Script"
        name={name}
        keyValues={{
          "Function Name": props.functionName,
        }}
      />
    );
  }

  return <div className="ConstructPanel">{renderConstruct()}</div>;
}
