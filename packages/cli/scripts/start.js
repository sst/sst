"use strict";

const path = require("path");
const array = require("../lib/array");
const fs = require("fs-extra");
const chalk = require("chalk");
const detect = require("detect-port-alt");

const {
  logger,
  getChildLogger,
  STACK_DEPLOY_STATUS,
  Runtime,
  Bridge,
  State,
  useStacksBuilder,
  useFunctionBuilder,
} = require("@serverless-stack/core");

const paths = require("./util/paths");
const {
  synth,
  deploy,
  prepareCdk,
  writeConfig,
  checkFileExists,
  writeOutputsFile,
} = require("./util/cdkHelpers");
const objectUtil = require("../lib/object");
const ApiServer = require("./util/ApiServer");
const ConstructsState = require("./util/ConstructsState");

const API_SERVER_PORT = 4000;

let apiServer;
let isConsoleEnabled = false;
// This flag is currently used by the "sst.Script" construct to make the "BuiltAt"
// remain the same when rebuilding infrastructure.
const debugStartedAt = Date.now();

const IS_TEST = process.env.__TEST__ === "true";

// Setup logger
const clientLogger = {
  debug: (...m) => {
    getChildLogger("client").debug(...m);
  },
  trace: (...m) => {
    // If console is not enabled, print trace in terminal (ie. request logs)
    isConsoleEnabled
      ? getChildLogger("client").trace(...m)
      : getChildLogger("client").info(...m);
    forwardToBrowser(...m);
  },
  // This is a temporary workaround to send metadata alongside log message to
  // browser. After we decide if we want to keep both the terminal and console modes
  // we can clean this up. Ideally all logs sent to the browser should have metadata
  // attached. Note that you cannot log multiple arguments with
  // "traceWithMetadata()", the first arg is the log message and the second arg
  // is the metadata.
  traceWithMetadata: (m, metadata) => {
    // If console is not enabled, print trace in terminal (ie. request logs)
    isConsoleEnabled
      ? getChildLogger("client").trace(m)
      : getChildLogger("client").info(m);
    forwardToBrowser(m, metadata);
  },
  info: (...m) => {
    getChildLogger("client").info(...m);
    forwardToBrowser(...m);
  },
  warn: (...m) => {
    getChildLogger("client").warn(...m);
    forwardToBrowser(...m);
  },
  error: (...m) => {
    getChildLogger("client").error(...m);
    forwardToBrowser(...m);
  },
};

module.exports = async function (argv, config, cliInfo) {
  await prepareCdk(argv, cliInfo, config);

  // Deploy debug stack
  const debugStackOutputs = await deployDebugStack(config, cliInfo);
  const debugEndpoint = debugStackOutputs.Endpoint;
  const debugBucketArn = debugStackOutputs.BucketArn;
  const debugBucketName = debugStackOutputs.BucketName;

  // Startup UDP
  const bridge = new Bridge.Server();
  if (argv.udp) {
    clientLogger.info(chalk.grey(`Using UDP connection`));
    config.debugBridge = await bridge.start();
  }

  // Deploy app
  const { deployRet: appStackDeployRet } = await deployApp(
    argv,
    {
      ...config,
      debugEndpoint,
      debugBucketArn,
      debugBucketName,
    },
    cliInfo
  );
  await updateStaticSiteEnvironmentOutputs(appStackDeployRet);

  if (IS_TEST) {
    process.exit(0);
  }

  logger.info("");
  logger.info("==========================");
  logger.info(" Starting Live Lambda Dev");
  logger.info("==========================");
  logger.info("");

  const funcs = State.Function.read(paths.appPath);

  // Startup Websocket
  const ws = new Runtime.WS();
  ws.onMessage.add((msg) => {
    switch (msg.action) {
      case "register":
        bridge.addPeer(msg.body);
        bridge.ping();
        break;
      case "server.clientRegistered":
        clientLogger.info("Debug session started. Listening for requests...");
        clientLogger.debug(`Client connection id: ${msg.clientConnectionId}`);
        break;
      case "server.clientDisconnectedDueToNewClient":
        clientLogger.warn(
          "A new debug session has been started. This session will be closed..."
        );
        break;
      case "server.failedToSendResponseDueToStubDisconnected":
        clientLogger.error(
          chalk.grey(msg.debugRequestId) +
            " Failed to send response because the Lambda function is disconnected"
        );
        break;
    }
  });
  ws.start(debugEndpoint, debugBucketName);

  const server = new Runtime.Server({
    port: argv.port || (await chooseServerPort(12557)),
  });
  server.onStdErr.add((arg) => {
    arg.data.endsWith("\n")
      ? clientLogger.trace(arg.data.slice(0, -1))
      : clientLogger.trace(arg.data);
  });
  server.onStdOut.add((arg) => {
    arg.data.endsWith("\n")
      ? clientLogger.trace(arg.data.slice(0, -1))
      : clientLogger.trace(arg.data);
  });
  server.listen();

  // Wire up watcher
  const watcher = new Runtime.Watcher();
  watcher.reload(paths.appPath, config);

  const functionBuilder = useFunctionBuilder({
    root: paths.appPath,
    checks: {
      type: config.typeCheck,
      lint: config.lint,
    },
  });
  functionBuilder.reload();

  functionBuilder.onTransition.add((evt) => {
    const { value, context } = evt.state;
    if (value === "building")
      clientLogger.info(
        chalk.gray(
          `Functions: Building ${context.info.srcPath} ${context.info.handler}...`
        )
      );

    if (value === "checking") {
      clientLogger.info(
        chalk.gray(
          `Functions: Done building ${context.info.srcPath} ${
            context.info.handler
          } (${Date.now() - context.buildStart}ms)`
        )
      );
      server.drain(context.info);
    }
  });

  // watcher.onChange.add(build);
  watcher.onChange.add((evt) => {
    logger.debug("File changed: ", evt.files);
    functionBuilder.broadcast({
      type: "FILE_CHANGE",
      file: evt.files[0],
    });
  });

  const constructsState = new ConstructsState({
    app: config.name,
    region: config.region,
    stage: config.stage,
    onConstructsUpdated: () => {
      if (constructsState) {
        apiServer &&
          apiServer.publish("CONSTRUCTS_UPDATED", {
            constructsUpdated: constructsState.listConstructs(),
          });
      }
    },
  });
  const stacksBuilder = useStacksBuilder(
    paths.appPath,
    config,
    cliInfo.cdkOptions,
    deploy
  );
  stacksBuilder.onTransition(async (state) => {
    if (state.value.idle) {
      if (state.value.idle === "unchanged") {
        clientLogger.info(chalk.grey("Stacks: No changes to deploy."));
      }
      if (state.value.idle === "deployed") {
        watcher.reload(paths.appPath, config);
        constructsState.handleUpdateConstructs();
        await Promise.all(funcs.map((f) => server.drain(f).catch(() => {})));
        funcs.splice(0, funcs.length, ...State.Function.read(paths.appPath));
      }
    }
    if (state.value === "building") {
      clientLogger.info(chalk.grey("Stacks: Building changes..."));
    }
    if (state.value === "synthing") {
      clientLogger.info(chalk.grey("Stacks: Synthesizing changes..."));
    }
    if (state.value === "deployable") {
      clientLogger.info(
        chalk.cyan(
          "Stacks: There are new infrastructure changes. Press ENTER to redeploy."
        )
      );
    }
  });

  if (!IS_TEST)
    process.stdin.on("data", () => stacksBuilder.send("TRIGGER_DEPLOY"));

  // Handle requests from udp or ws
  async function handleRequest(req) {
    const timeoutAt = Date.now() + req.debugRequestTimeoutInMs;
    const func = funcs.find((f) => f.id === req.functionId);
    if (!func) {
      console.error("Unable to find function", req.functionId);
      return {
        type: "failure",
        body: "Failed to find function",
      };
    }
    functionBuilder.send(func.id, { type: "INVOKE" });
    const eventSource = parseEventSource(req.event);
    const eventSourceDesc =
      eventSource === null ? " invoked" : ` invoked by ${eventSource}`;
    clientLogger.traceWithMetadata(
      chalk.grey(
        `${req.context.awsRequestId} REQUEST ${req.env.AWS_LAMBDA_FUNCTION_NAME} [${func.handler}]${eventSourceDesc}`
      ),
      { event: req.event }
    );

    clientLogger.debug("Invoking local function...");
    const result = await server.invoke({
      function: {
        ...func,
        root: paths.appPath,
      },
      env: {
        ...getSystemEnv(),
        ...req.env,
      },
      payload: {
        event: req.event,
        context: req.context,
        deadline: timeoutAt,
      },
    });
    clientLogger.debug("Response", result);

    if (result.type === "success") {
      clientLogger.traceWithMetadata(
        chalk.grey(
          `${req.context.awsRequestId} RESPONSE ${objectUtil.truncate(
            result.data,
            {
              totalLength: 1500,
              arrayLength: 10,
              stringLength: 100,
            }
          )}`
        ),
        { response: result.data }
      );
      return {
        type: "success",
        body: result.data,
      };
    }

    if (result.type === "failure") {
      clientLogger.info(
        `${chalk.grey(req.context.awsRequestId)} ${chalk.red("ERROR")}`,
        result.error.errorType + ":",
        result.error.errorMessage,
        "\n",
        result.error.stackTrace?.join("\n")
      );
      return {
        type: "failure",
        body: {
          errorMessage: result.error.errorMessage,
          errorType: result.error.errorType,
          stackTrace: result.error.stackTrace,
        },
      };
    }
  }

  bridge.onRequest(handleRequest);
  ws.onRequest(handleRequest);

  if (argv.console) {
    if (argv.console === "never") startApiServer();
    logger.info(
      chalk.yellow(
        "This release does not have SST Console support, we're working on a new version that is coming soon"
      )
    );
    process.exit(1);
  }
};

async function deployDebugStack(config, cliInfo) {
  // Do not deploy if running test
  if (IS_TEST) {
    return {
      Endpoint: "ws://test-endpoint",
      BucketArn: "bucket-arn",
      BucketName: "bucket-name",
    };
  }

  logger.info("");
  logger.info("=======================");
  logger.info(" Deploying debug stack");
  logger.info("=======================");
  logger.info("");

  const stackName = `${config.stage}-${config.name}-debug-stack`;
  const cdkOptions = {
    ...cliInfo.cdkOptions,
    app: `node bin/index.js ${stackName} ${config.stage} ${config.region} ${
      paths.appPath
    } ${State.stacksPath(paths.appPath)}`,
    output: "cdk.out",
  };

  // Change working directory
  // Note: When deploying the debug stack, the current working directory is user's app.
  //       Setting the current working directory to debug stack cdk app directory to allow
  //       Lambda Function construct be able to reference code with relative path.
  process.chdir(path.join(paths.ownPath, "assets", "debug-stack"));

  // Build
  await synth(cdkOptions);

  // Deploy
  const deployRet = await deploy(cdkOptions);

  logger.debug("deployRet", deployRet);

  // Restore working directory
  process.chdir(paths.appPath);

  // Get WebSocket endpoint
  if (
    !deployRet ||
    deployRet.length !== 1 ||
    deployRet[0].status === STACK_DEPLOY_STATUS.FAILED
  ) {
    throw new Error(`Failed to deploy debug stack ${stackName}`);
  } else if (!deployRet[0].outputs || !deployRet[0].outputs.Endpoint) {
    throw new Error(
      `Failed to get the endpoint from the deployed debug stack ${stackName}`
    );
  }

  return deployRet[0].outputs;
}

async function deployApp(argv, config, cliInfo) {
  logger.info("");
  logger.info("===============");
  logger.info(" Deploying app");
  logger.info("===============");
  logger.info("");

  await writeConfig({
    ...config,
    debugStartedAt,
    debugIncreaseTimeout: argv.increaseTimeout || false,
  });

  // Build
  await synth(cliInfo.cdkOptions);

  let deployRet;
  if (IS_TEST) {
    deployRet = [];
  } else {
    // Deploy
    deployRet = await deploy({
      ...cliInfo.cdkOptions,
      hotswap: true,
    });

    // Check all stacks deployed successfully
    if (
      deployRet.some((stack) => stack.status === STACK_DEPLOY_STATUS.FAILED)
    ) {
      throw new Error(`Failed to deploy the app`);
    }
  }

  // Write outputsFile
  if (argv.outputsFile) {
    await writeOutputsFile(
      deployRet,
      path.join(paths.appPath, argv.outputsFile),
      cliInfo.cdkOptions
    );
  }

  return { deployRet };
}

async function startApiServer() {
  const port = await chooseServerPort(API_SERVER_PORT);
  apiServer = new ApiServer({});
  await apiServer.start(port);

  logger.info(
    `\nYou can now view the SST Console in the browser: ${chalk.cyan(
      `http://localhost:${port}`
    )}`
  );
  // note: if working on the CLI package (ie. running within the CLI package),
  //       print out how to start up console.
  if (isRunningWithinCliPackage()) {
    logger.info(
      `If you are working on the SST Console, navigate to ${chalk.cyan(
        "assets/console"
      )} and run ${chalk.cyan(`REACT_APP_SST_PORT=${port} yarn start`)}`
    );
  }
}

////////////////////
// Util functions //
////////////////////

async function updateStaticSiteEnvironmentOutputs(deployRet) {
  // ie. environments outputs
  // [{
  //    id: "MyFrontend",
  //    path: "src/sites/react-app",
  //    stack: "dev-playground-another",
  //    environmentOutputs: {
  //      "REACT_APP_API_URL":"FrontendSSTSTATICSITEENVREACTAPPAPIURLFAEF5D8C",
  //      "ABC":"FrontendSSTSTATICSITEENVABC527391D2"
  //    }
  // }]
  //
  // ie. deployRet
  // [{
  //    name: "dev-playground-another",
  //    outputs: {
  //      "FrontendSSTSTATICSITEENVREACTAPPAPIURLFAEF5D8C":"https://...",
  //      "FrontendSSTSTATICSITEENVABC527391D2":"hi"
  //    }
  // }]
  const environmentOutputKeysPath = path.join(
    paths.appPath,
    paths.appBuildDir,
    "static-site-environment-output-keys.json"
  );
  const environmentOutputValuesPath = path.join(
    paths.appPath,
    paths.appBuildDir,
    "static-site-environment-output-values.json"
  );

  if (!(await checkFileExists(environmentOutputKeysPath))) {
    throw new Error(`Failed to get the StaticSite info from the app`);
  }

  // Replace output value with stack output
  const environments = await fs.readJson(environmentOutputKeysPath);
  environments.forEach(({ stack, environmentOutputs }) => {
    const stackData = deployRet.find(({ name }) => name === stack);
    if (stackData) {
      Object.entries(environmentOutputs).forEach(([envName, outputName]) => {
        environmentOutputs[envName] = stackData.outputs[outputName];
      });
    }
  });

  // Update file
  await fs.writeJson(environmentOutputValuesPath, environments);
}

async function chooseServerPort(defaultPort) {
  const host = "0.0.0.0";
  logger.debug(`Checking port ${defaultPort} on host ${host}`);

  try {
    return detect(defaultPort, host);
  } catch (err) {
    throw new Error(
      chalk.red(`Could not find an open port at ${chalk.bold(host)}.`) +
        "\n" +
        ("Network error message: " + err.message || err) +
        "\n"
    );
  }
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
        "packages",
        "cli",
        "scripts",
        "start.js"
      )
    )
  );
}

function getSystemEnv() {
  const env = { ...process.env };
  // AWS_PROFILE is defined if users run `AWS_PROFILE=xx sst start`, and in
  // aws sdk v3, AWS_PROFILE takes precedence over AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY.
  // Hence we need to remove it to ensure the invoked function uses the IAM
  // credentials from the remote Lambda.
  delete env.AWS_PROFILE;
  return env;
}

function forwardToBrowser(message, metadata) {
  apiServer &&
    apiServer.publish("RUNTIME_LOG_ADDED", {
      runtimeLogAdded: {
        message: message.endsWith("\n") ? message : `${message}\n`,
        metadata: metadata && JSON.stringify(metadata),
      },
    });
}

function parseEventSource(event) {
  try {
    // HTTP
    if (["2.0", "1.0"].includes(event.version) && event.requestContext.apiId) {
      return event.version === "1.0"
        ? `API ${event.httpMethod} ${event.path}`
        : `API ${event.requestContext.http.method} ${event.rawPath}`;
    }

    // HTTP Authorizer
    if (["TOKEN", "REQUEST"].includes(event.type) && event.methodArn) {
      return "API authorizer";
    }

    if (event.Records && event.Records.length > 0) {
      // SNS
      if (event.Records[0].EventSource === "aws:sns") {
        // TopicArn: arn:aws:sns:us-east-1:123456789012:ExampleTopic
        const topics = array.unique(
          event.Records.map((record) => record.Sns.TopicArn.split(":").pop())
        );
        return topics.length === 1
          ? `SNS topic ${topics[0]}`
          : `SNS topics: ${topics.join(", ")}`;
      }
      // SQS
      if (event.Records.EventSource === "aws:sqs") {
        // eventSourceARN: arn:aws:sqs:us-east-1:123456789012:MyQueue
        const names = array.unique(
          event.Records.map((record) => record.eventSourceARN.split(":").pop())
        );
        return names.length === 1
          ? `SQS queue ${names[0]}`
          : `SQS queues: ${names.join(", ")}`;
      }
      // DynamoDB
      if (event.Records.EventSource === "aws:dynamodb") {
        return "DynamoDB";
      }
    }
  } catch (e) {
    clientLogger.debug("Failed to parse event source", e);
  }

  return null;
}
