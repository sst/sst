"use strict";

const cors = require("cors");
const http = require("http");
const path = require("path");
const chalk = require("chalk");
const isRoot = require("is-root");
const express = require("express");
const prompts = require("prompts");
const detect = require("detect-port-alt");
const { ApolloServer, gql } = require("apollo-server-express");

const { getChildLogger } = require("@serverless-stack/core");
const logger = getChildLogger("api-server");

module.exports = class ApiServer {
  constructor({
    pubsub,
    constructsState,
    cdkWatcherState,
    lambdaWatcherState,
  }) {
    this.requests = {};
    this.host = null;
    this.port = null;
    this.server = null;
    this.pubsub = pubsub;
    this.constructsState = constructsState;
    this.cdkWatcherState = cdkWatcherState;
    this.lambdaWatcherState = lambdaWatcherState;
  }

  async start(host, defaultPort) {
    const port = await choosePort(host, defaultPort);
    this.host = host;
    this.port = port;

    const app = express();

    this.server = http.createServer(app);

    //////////////////
    // API routes
    //////////////////

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
        type: String
        message: String
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
        getConstructs: () => this.constructsState.listConstructs(),
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
        path: "/_sst_start_internal_/graphql",
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
      path: "/_sst_start_internal_/graphql",
    });
    apolloServer.installSubscriptionHandlers(this.server);

    // Enable CORS to enable launch React on port 3000 and able to hit
    // the api on the default port while developing.
    app.use(cors());

    //////////////////
    // React routes
    //////////////////

    // Enable React to run off the root
    app.use(
      express.static(
        path.join(__dirname, "..", "..", "assets", "browser-console", "build")
      )
    );
    app.use(
      express.static(
        path.join(__dirname, "..", "..", "assets", "browser-console", "public")
      )
    );

    app.use((req, res) => {
      res.sendFile(
        path.join(
          __dirname,
          "..",
          "..",
          "assets",
          "browser-console",
          "build",
          "index.html"
        )
      );
    });

    // Start server
    await new Promise((resolve) => this.server.listen(port, resolve));

    logger.debug("Lambda runtime server started");
  }

  stop() {
    this.server.close();
  }
};

// Code from create react app
// https://github.com/facebook/create-react-app/blob/master/packages/react-dev-utils/WebpackDevServerUtils.js#L448
function choosePort(host, defaultPort) {
  return detect(defaultPort, host).then(
    (port) =>
      new Promise((resolve) => {
        if (port === defaultPort) {
          return resolve(port);
        }
        const message =
          process.platform !== "win32" && defaultPort < 1024 && !isRoot()
            ? `Admin permissions are required to run a server on a port below 1024.`
            : `Something is already running on port ${defaultPort}.`;
        //clearConsole();
        const question = {
          type: "confirm",
          name: "shouldChangePort",
          message:
            chalk.cyan(message) +
            "\n\nWould you like to run the app on another port instead?",
          initial: true,
        };
        prompts(question).then((answer) => {
          if (answer.shouldChangePort) {
            resolve(port);
          } else {
            resolve(null);
          }
        });
      }),
    (err) => {
      throw new Error(
        chalk.red(`Could not find an open port at ${chalk.bold(host)}.`) +
          "\n" +
          ("Network error message: " + err.message || err) +
          "\n"
      );
    }
  );
}
