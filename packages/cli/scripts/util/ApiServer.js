"use strict";

const cors = require("cors");
const http = require("http");
const path = require("path");
const open = require("open");
const chalk = require("chalk");
const isRoot = require("is-root");
const express = require("express");
const prompts = require("prompts");
const detect = require("detect-port-alt");
const { ApolloServer, PubSub, gql } = require("apollo-server-express");

const { getChildLogger } = require("@serverless-stack/core");
const logger = getChildLogger("api-server");

module.exports = class ApiServer {
  constructor({ constructsState, cdkWatcherState, lambdaWatcherState }) {
    this.requests = {};
    this.port = null;
    this.server = null;
    this.pubsub = new PubSub();
    this.constructsState = constructsState;
    this.cdkWatcherState = cdkWatcherState;
    this.lambdaWatcherState = lambdaWatcherState;
  }

  async start(defaultPort) {
    const port = await choosePort(defaultPort);
    this.port = port;

    const app = express();

    this.server = http.createServer(app);
    await this.addApolloRoute(app);
    this.addReactRoutes(app);

    // Start server
    await new Promise((resolve) => this.server.listen(port, resolve));

    // Open browser
    const url = `http://localhost:${this.port}`;
    await openBrowser(url);

    logger.debug("Lambda runtime server started");

    // note: if working on the CLI package (ie. running within the CLI package),
    //       print out how to start up console.
    if (isRunningWithinCliPackage()) {
      logger.info(
        `If you are working on the SST Console, navigate to ${chalk.cyan(
          "assets/console"
        )} and run ${chalk.cyan(`REACT_APP_SST_PORT=${this.port} yarn start`)}`
      );
    }
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

function isRunningWithinCliPackage() {
  return (
    path.resolve(__filename) ===
    path.resolve(
      path.join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "packages",
        "cli",
        "scripts",
        "util",
        "ApiServer.js"
      )
    )
  );
}

// Code from create react app
// https://github.com/facebook/create-react-app/blob/master/packages/react-dev-utils/WebpackDevServerUtils.js#L448
function choosePort(defaultPort) {
  const host = "0.0.0.0";
  logger.debug(`Checking port ${defaultPort} on host ${host} for Api server`);

  return detect(defaultPort, host).then(
    (port) =>
      new Promise((resolve) => {
        logger.debug(`Found open port ${port}`);

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
