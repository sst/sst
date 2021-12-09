"use strict";

const cors = require("cors");
const http = require("http");
const path = require("path");
const open = require("open");
const express = require("express");
const { ApolloServer, PubSub, gql } = require("apollo-server-express");

const { getChildLogger } = require("@serverless-stack/core");
const logger = getChildLogger("api-server");

module.exports = class ApiServer {
  constructor({ constructsState, cdkWatcherState, lambdaWatcherState }) {
    this.requests = {};
    this.server = null;
    this.pubsub = new PubSub();
    this.constructsState = constructsState;
    this.cdkWatcherState = cdkWatcherState;
    this.lambdaWatcherState = lambdaWatcherState;
  }

  async start(port) {
    const app = express();

    this.server = http.createServer(app);
    await this.addApolloRoute(app);
    this.addReactRoutes(app);

    // Start server
    await new Promise((resolve) => this.server.listen(port, resolve));

    // Open browser
    const url = `http://localhost:${port}`;
    await openBrowser(url);

    logger.debug("Lambda runtime server started");
  }

  stop() {
    this.server.close();
  }

  publish(name, data) {
    this.pubsub.publish(name, data);
  }

  async addApolloRoute(app) {
    const typeDefs = gql`
      type Query {
        getRuntimeLogs: [Log]
        getInfraStatus: InfraStatusInfo
        getLambdaStatus: LambdaStatusInfo
        getConstructs: ConstructsInfo
      }
      type Mutation {
        deploy: Boolean
        invoke(data: String): Boolean
      }
      type Subscription {
        runtimeLogAdded: Log
        infraStatusUpdated: InfraStatusInfo
        lambdaStatusUpdated: LambdaStatusInfo
        constructsUpdated: ConstructsInfo
      }
      type Log {
        message: String
        metadata: String
      }
      type InfraStatusInfo {
        buildStatus: String
        buildErrors: [StatusError]
        deployStatus: String
        deployErrors: [StatusError]
        canDeploy: Boolean
        canQueueDeploy: Boolean
        deployQueued: Boolean
      }
      type LambdaStatusInfo {
        buildStatus: String
        buildErrors: [StatusError]
      }
      type StatusError {
        type: String
        message: String
        errorCount: Int
        warningCount: Int
      }
      type ConstructsInfo {
        error: String
        isLoading: Boolean
        constructs: String
      }
    `;

    const resolvers = {
      Query: {
        getRuntimeLogs: () => [],
        getInfraStatus: () => this.cdkWatcherState.getStatus(),
        getLambdaStatus: () => this.lambdaWatcherState.getStatus(),
        getConstructs: async () => await this.constructsState.listConstructs(),
      },
      Mutation: {
        deploy: async () => {
          await this.cdkWatcherState.handleDeploy();
        },
        invoke: async (_, { data }) => {
          await this.constructsState.invoke(JSON.parse(data));
        },
      },
      Subscription: {
        runtimeLogAdded: {
          subscribe: () => this.pubsub.asyncIterator(["RUNTIME_LOG_ADDED"]),
        },
        infraStatusUpdated: {
          subscribe: () => this.pubsub.asyncIterator(["INFRA_STATUS_UPDATED"]),
        },
        lambdaStatusUpdated: {
          subscribe: () => this.pubsub.asyncIterator(["LAMBDA_STATUS_UPDATED"]),
        },
        constructsUpdated: {
          subscribe: () => this.pubsub.asyncIterator(["CONSTRUCTS_UPDATED"]),
        },
      },
    };

    const apolloServer = new ApolloServer({
      subscriptions: {
        path: "/graphql",
        onConnect: () => {
          logger.debug("Client connected for subscriptions");
        },
        onDisconnect: () => {
          logger.debug("Client disconnected from subscriptions");
        },
      },
      typeDefs,
      resolvers,
    });
    await apolloServer.start();
    apolloServer.applyMiddleware({
      app,
      path: "/graphql",
    });
    apolloServer.installSubscriptionHandlers(this.server);
  }

  addReactRoutes(app) {
    // Enable CORS to enable launch React on port 3000 and able to hit
    // the api on the default port while developing.
    app.use(cors());

    const consolePath = path.join(__dirname, "..", "..", "assets", "console");
    // Enable React to run off the root
    app.use(express.static(path.join(consolePath, "build")));
    app.use(express.static(path.join(consolePath, "public")));

    app.use((req, res) => {
      res.sendFile(path.join(consolePath, "build", "index.html"));
    });
  }
};

function openBrowser(url) {
  open(url).catch(() => {}); // Prevent `unhandledRejection` error.;
}
