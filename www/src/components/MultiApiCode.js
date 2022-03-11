import React from "react";
import Tabs from "@theme/Tabs";

export default function MultiApiCode(props) {
  return (
    <Tabs
      groupId="code-snippets"
      defaultValue="api"
      values={[
        { label: "Api", value: "api" },
        { label: "GraphQLApi", value: "graph" },
        { label: "WebSocketApi", value: "websocket" },
      ]}
    >
      {props.children}
    </Tabs>
  );
}
