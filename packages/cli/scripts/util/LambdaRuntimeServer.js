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

const API_VERSION = "2018-06-01";

module.exports = class LambdaRuntimeServer {
  constructor({ pubsub, constructsState, cdkWatcherState }) {
    this.requests = {};
    this.host = null;
    this.port = null;
    this.server = null;
    this.pubsub = pubsub;
    this.constructsState = constructsState;
    this.cdkWatcherState = cdkWatcherState;
  }

  async start(host, defaultPort) {
    const port = await choosePort(host, defaultPort);
    this.host = host;
    this.port = port;

    const app = express();

    // For .NET runtime, the "aws-lambda-dotnet" package sets the type to
    // "application/*+json" for requests made to the error endpoint.
    app.use(
      express.json({
        type: ["application/json", "application/*+json"],
        limit: "10mb",
      })
    );
    // TODO REMOVE
    //app.use(bodyParser.json());
    this.server = http.createServer(app);

    //////////////////
    // Lambda Runtime API routes
    //////////////////

    app.get(
      `/:debugRequestId/${API_VERSION}/runtime/invocation/next`,
      (req, res) => {
        const debugRequestId = req.params.debugRequestId;
        logger.debug(debugRequestId, "/runtime/invocation/next");
        const { timeoutAt, event, context } = this.requests[debugRequestId];
        res.set({
          "Lambda-Runtime-Aws-Request-Id": context.awsRequestId,
          "Lambda-Runtime-Deadline-Ms": timeoutAt,
          "Lambda-Runtime-Invoked-Function-Arn": context.invokedFunctionArn,
          //'Lambda-Runtime-Trace-Id – The AWS X-Ray tracing header.
          "Lambda-Runtime-Client-Context": JSON.stringify(
            context.identity || {}
          ),
          "Lambda-Runtime-Cognito-Identity": JSON.stringify(
            context.clientContext || {}
          ),
        });
        res.json(event);
      }
    );

    app.post(
      `/:debugRequestId/${API_VERSION}/runtime/invocation/:awsRequestId/response`,
      (req) => {
        const debugRequestId = req.params.debugRequestId;
        logger.debug(
          debugRequestId,
          "/runtime/invocation/:awsRequestId/response",
          req.body
        );
        const request = this.requests[debugRequestId];
        request.onSuccess(req.body);
      }
    );

    app.post(
      `/:debugRequestId/${API_VERSION}/runtime/invocation/:awsRequestId/error`,
      (req) => {
        const debugRequestId = req.params.debugRequestId;
        logger.debug(
          debugRequestId,
          "/runtime/invocation/:awsRequestId/error",
          req.body
        );
        const request = this.requests[debugRequestId];
        request.onFailure(req.body);
      }
    );

    app.post(`/:debugRequestId/${API_VERSION}/runtime/init/error`, (req) => {
      const debugRequestId = req.params.debugRequestId;
      logger.debug(debugRequestId, "/runtime/init/error", req.body);
      const request = this.requests[debugRequestId];
      request.onFailure(req.body);
    });

    //////////////////
    // API routes
    //////////////////

    const typeDefs = gql`
      type Query {
        getRuntimeLogs: [Log]
        getInfraBuildStatus: InfraBuildStatusInfo
        getConstructs: ConstructsInfo
      }
      type Mutation {
        invoke(data: String): Boolean
      }
      type Subscription {
        runtimeLogAdded: Log
        infraBuildStatusUpdated: InfraBuildStatusInfo
        constructsUpdated: ConstructsInfo
      }
      type Log {
        type: String
        message: String
      }
      type InfraBuildStatusInfo {
        status: String
        errors: [String]
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
        getInfraBuildStatus: () => this.cdkWatcherState.getStatus(),
        getConstructs: () => this.constructsState.listConstructs(),
      },
      Mutation: {
        invoke: async (_, { data }) => {
          await this.constructsState.invoke(JSON.parse(data));
        },
      },
      Subscription: {
        runtimeLogAdded: {
          subscribe: () => this.pubsub.asyncIterator(["RUNTIME_LOG_ADDED"]),
        },
        infraBuildStatusUpdated: {
          subscribe: () => this.pubsub.asyncIterator(["INFRA_BUILD_STATUS_UPDATED"]),
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

  addRequest({
    debugRequestId,
    timeoutAt,
    event,
    context,
    onSuccess,
    onFailure,
  }) {
    this.requests[debugRequestId] = {
      timeoutAt,
      event,
      context,
      onSuccess,
      onFailure,
    };
  }

  removeRequest(debugRequestId) {
    delete this.requests[debugRequestId];
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
