import {
  split,
  HttpLink,
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
} from "@apollo/client";
import { WebSocketLink } from "@apollo/client/link/ws";
import { getMainDefinition } from "@apollo/client/utilities";
import { SubscriptionClient } from "subscriptions-transport-ws";
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

import "./sass/custom.scss";
import "./index.css";

// Build url host. When working on SST console, the React app is started
// separately. Need to pass in the GraphQL server port via REACT_APP_SST_PORT.
const hostname = window.location.hostname;
const port = process.env.REACT_APP_SST_PORT || window.location.port;
const httpLink = new HttpLink({
  uri: `http://${hostname}:${port}/graphql`,
});

const wsClient = new SubscriptionClient(`ws://${hostname}:${port}/graphql`, {
  reconnect: true,
});

const wsLink = new WebSocketLink(wsClient);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  httpLink
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

ReactDOM.render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App wsClient={wsClient} />
    </ApolloProvider>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
