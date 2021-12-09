import { useState } from "react";
import ApiConstructPanel from "./ApiConstructPanel";
import CronConstructPanel from "./CronConstructPanel";
import BasicConstructPanel from "./BasicConstructPanel";
import QueueConstructPanel from "./QueueConstructPanel";
import TopicConstructPanel from "./TopicConstructPanel";
import EventBusConstructPanel from "./EventBusConstructPanel";
import FunctionConstructPanel from "./FunctionConstructPanel";
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
      case "Function":
        return renderFunction(construct);
      default:
        return;
    }
  }

  function renderAuth({ type, name, identityPoolId }) {
    return (
      <BasicConstructPanel
        type={type}
        name={name}
        keyValues={{
          "Identity Pool ID": identityPoolId,
        }}
      />
    );
  }

  function renderApi(construct) {
    return <ApiConstructPanel {...construct} />;
  }

  function renderApiGatewayV1Api(construct) {
    return <ApiConstructPanel {...construct} />;
  }

  function renderApolloApi({ type, name, httpApiEndpoint, customDomainUrl }) {
    return (
      <BasicConstructPanel
        type={type}
        name={name}
        keyValues={{
          URL: { url: httpApiEndpoint },
          "Custom Domain URL": customDomainUrl
            ? { url: customDomainUrl }
            : undefined,
        }}
      />
    );
  }

  function renderAppSyncApi({
    type,
    name,
    graphqlApiEndpoint,
    realtimeApiEndpoint,
  }) {
    return (
      <BasicConstructPanel
        type={type}
        name={name}
        keyValues={{
          "GraphQL URL": { url: graphqlApiEndpoint },
          "WebSocket URL": { url: realtimeApiEndpoint },
        }}
      />
    );
  }

  function renderWebSocketApi(construct) {
    return <WebSocketApiConstructPanel {...construct} />;
  }

  function renderQueue(construct) {
    return (
      <QueueConstructPanel
        {...construct}
        triggering={triggering}
        onTrigger={onTrigger}
      />
    );
  }

  function renderTopic(construct) {
    return (
      <TopicConstructPanel
        {...construct}
        triggering={triggering}
        onTrigger={onTrigger}
      />
    );
  }

  function renderCron(construct) {
    return (
      <CronConstructPanel
        {...construct}
        triggering={triggering}
        onTrigger={onTrigger}
      />
    );
  }

  function renderBucket({ type, name, bucketName }) {
    return (
      <BasicConstructPanel
        type={type}
        name={name}
        keyValues={{
          "Bucket Name": bucketName,
        }}
      />
    );
  }

  function renderTable({ type, name, tableName }) {
    return (
      <BasicConstructPanel
        type={type}
        name={name}
        keyValues={{
          "Table Name": tableName,
        }}
      />
    );
  }

  function renderEventBus({ type, name, eventBusName }) {
    return (
      <EventBusConstructPanel
        {...construct}
        triggering={triggering}
        onTrigger={onTrigger}
      />
    );
  }

  function renderKinesisStream(construct) {
    return (
      <KinesisStreamConstructPanel
        {...construct}
        triggering={triggering}
        onTrigger={onTrigger}
      />
    );
  }

  function renderStaticSite({ type, name, endpoint, customDomainUrl }) {
    return (
      <BasicConstructPanel
        type={type}
        name={name}
        keyValues={{
          URL: { url: endpoint },
          "Custom Domain URL": customDomainUrl
            ? { url: customDomainUrl }
            : undefined,
        }}
      />
    );
  }

  function renderReactStaticSite({ type, name, endpoint, customDomainUrl }) {
    return (
      <BasicConstructPanel
        type={type}
        name={name}
        keyValues={{
          URL: { url: endpoint },
          "Custom Domain URL": customDomainUrl
            ? { url: customDomainUrl }
            : undefined,
        }}
      />
    );
  }

  function renderNextjsSite({ type, name, endpoint, customDomainUrl }) {
    return (
      <BasicConstructPanel
        type={type}
        name={name}
        keyValues={{
          URL: { url: endpoint },
          "Custom Domain URL": customDomainUrl
            ? { url: customDomainUrl }
            : undefined,
        }}
      />
    );
  }

  function renderFunction(construct) {
    return (
      <FunctionConstructPanel
        {...construct}
        triggering={triggering}
        onTrigger={onTrigger}
      />
    );
  }

  return <div className="ConstructPanel">{renderConstruct()}</div>;
}
