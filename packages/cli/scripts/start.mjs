"use strict";

import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import readline from "readline";
import detect from "detect-port-alt";
import array from "../lib/array.mjs";

import {
  logger,
  getChildLogger,
  STACK_DEPLOY_STATUS,
  Runtime,
  State,
  useStacksBuilder,
  useFunctionBuilder,
  useLocalServer,
  createProjectWatcher,
  createBus,
  createPothosBuilder,
  createKyselyTypeGenerator,
  createRDSWarmer,
} from "@serverless-stack/core";

import paths from "./util/paths.mjs";
import {
  synth,
  deploy,
  prepareCdk,
  writeConfig,
  checkFileExists,
  writeOutputsFile,
  validatePropsForJs,
} from "./util/cdkHelpers.mjs";
import * as objectUtil from "../lib/object.mjs";
import CloudFormation from "aws-sdk/clients/cloudformation.js";

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
  },
  // This is a temporary workaround to send metadata alongside log message to
  // browser. After we decide if we want to keep both the terminal and console modes
  // we can clean this up. Ideally all logs sent to the browser should have metadata
  // attached. Note that you cannot log multiple arguments with
  // "traceWithMetadata()", the first arg is the log message and the second arg
  // is the metadata.
  traceWithMetadata: (m) => {
    // If console is not enabled, print trace in terminal (ie. request logs)
    isConsoleEnabled
      ? getChildLogger("client").trace(m)
      : getChildLogger("client").info(m);
  },
  info: (...m) => {
    getChildLogger("client").info(...m);
  },
  warn: (...m) => {
    getChildLogger("client").warn(...m);
  },
  error: (...m) => {
    getChildLogger("client").error(...m);
  },
};

export default async function (argv, config, cliInfo) {
  await prepareCdk(argv, cliInfo, config);

  // Deploy debug stack
  const debugStackOutputs = await deployDebugStack(config, cliInfo);
  const debugEndpoint = debugStackOutputs.Endpoint;
  const debugBucketArn = debugStackOutputs.BucketArn;
  const debugBucketName = debugStackOutputs.BucketName;

  // Startup UDP
  // const bridge = new Bridge.Server();
  if (argv.udp) {
    // clientLogger.info(chalk.grey(`Using UDP connection`));
    // config.debugBridge = await bridge.start();
    clientLogger.warn("UDP connections have been temporarily disabled");
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

  if (IS_TEST) {
    process.exit(0);
  }

  logger.info("");
  logger.info("==========================");
  logger.info(" Starting Live Lambda Dev");
  logger.info("==========================");
  logger.info("");

  const bus = createBus();
  createProjectWatcher({
    root: paths.appPath,
    bus,
  });
  createKyselyTypeGenerator({
    bus,
    config,
  });
  createPothosBuilder({
    bus,
  });
  createRDSWarmer({
    bus,
    config,
  });
  bus.subscribe("stacks.deployed", updateSiteEnvironmentOutputs);

  const funcs = State.Function.read(paths.appPath);

  // Startup Websocket
  const ws = new Runtime.WS();
  ws.onMessage.add((msg) => {
    switch (msg.action) {
      case "register":
        // bridge.addPeer(msg.body);
        // bridge.ping();
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
            ` Failed to send a response because the Lambda Function timed out. If this happens again, you can increase the function timeout or use the --increase-timeout option with "sst start". Read more about the option here: https://docs.sst.dev/packages/cli#options`
        );
        break;
    }
  });
  ws.start(config.region, debugEndpoint, debugBucketName);

  const server = new Runtime.Server({
    port: argv.port || (await chooseServerPort(12557)),
  });

  const local = await useLocalServer({
    live: true,
    port: await chooseServerPort(13557),
    app: config.name,
    stage: config.stage,
    region: config.region,
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
  server.onStdErr.add((arg) => {
    local.updateFunction(arg.funcId, (s) => {
      const entry = s.invocations.find((i) => i.id === arg.requestId);
      if (!entry) return;
      entry.logs.push({
        timestamp: Date.now(),
        message: arg.data,
      });
    });
  });
  server.onStdOut.add((arg) => {
    local.updateFunction(arg.funcId, (s) => {
      const entry = s.invocations.find((i) => i.id === arg.requestId);
      if (!entry) return;
      entry.logs.push({
        timestamp: Date.now(),
        message: arg.data,
      });
    });
  });
  server.listen();

  const watcher = new Runtime.Watcher();
  watcher.reload(paths.appPath);

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
    local.updateFunction(context.info.id, (draft) => {
      draft.warm = context.warm;
      draft.state = value;
      draft.issues = context.issues;
    });
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

  watcher.onChange.add((evt) => {
    logger.debug("File changed: ", evt.files);
    functionBuilder.broadcast({
      type: "FILE_CHANGE",
      file: evt.files[0],
    });
  });

  const stacksBuilder = useStacksBuilder(
    paths.appPath,
    bus,
    config,
    cliInfo.cdkOptions,
    async (opts) => {
      const result = await deploy(opts);
      if (result.some((r) => r.status === "failed"))
        throw new Error("Stacks failed to deploy");
      return result;
    },
    appStackDeployRet
  );
  stacksBuilder.onTransition(async (state) => {
    local.updateState((draft) => {
      draft.stacks.status = state.value;
    });
    if (state.value.idle) {
      if (state.value.idle === "unchanged") {
        await Promise.all(funcs.map((f) => server.drain(f).catch(() => {})));
        funcs.splice(0, funcs.length, ...State.Function.read(paths.appPath));
        clientLogger.info(chalk.grey("Stacks: No changes to deploy."));
      }
      if (state.value.idle === "deployed") {
        clientLogger.info(chalk.grey("Stacks: Deploying completed."));
        watcher.reload(paths.appPath);
        functionBuilder.reload();
        // TODO: Move all this to functionBuilder state machine
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
  local.onDeploy.add(() => stacksBuilder.send("TRIGGER_DEPLOY"));

  if (!IS_TEST) {
    readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    process.stdin.on("data", (key) => {
      // handle ctrl-c based on how the createInterface works
      // https://github.com/DefinitelyTyped/DefinitelyTyped/blob/0a2f0c574ce4fa573ef4e85f8c98f90c2fdf683a/types/node/readline.d.ts#L372
      if (key == "\u0003") {
        process.exit(0);
      }
      stacksBuilder.send("TRIGGER_DEPLOY");
    });
  }

  // Handle requests from udp or ws
  async function handleRequest(req) {
    const timeoutAt = Date.now() + req.debugRequestTimeoutInMs;
    const func = funcs.find((f) => f.id === req.functionId);
    if (!func) {
      console.error(
        `Function "${req.functionId}" could not be found in your app`
      );
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

    local.updateFunction(func.id, (draft) => {
      if (draft.invocations.length >= 25) draft.invocations.pop();
      draft.invocations.unshift({
        id: req.context.awsRequestId,
        request: req.event,
        times: {
          start: Date.now(),
        },
        logs: [],
      });
    });

    clientLogger.debug("Invoking local function...");
    bus.publish("function.requested", {
      localID: func.id,
      request: {
        event: req.event,
        context: req.context,
      },
    });
    const result = await server.invoke({
      function: {
        ...func,
        root: paths.appPath,
      },
      env: buildInvokeEnv(req.env),
      payload: {
        event: req.event,
        context: req.context,
        deadline: timeoutAt,
      },
    });
    bus.publish("function.responded", {
      localID: func.id,
      response: result,
      request: {
        event: req.event,
        context: req.context,
      },
    });
    local.updateFunction(func.id, (draft) => {
      const invocation = draft.invocations.find(
        (x) => x.id === req.context.awsRequestId
      );
      if (!invocation) return;
      invocation.response = result;
      invocation.times.end = Date.now();
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
        (result.error.stackTrace || []).join("\n")
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

  // bridge.onRequest(handleRequest);
  ws.onRequest(handleRequest);

  const url = `https://console.sst.dev/${config.name}/${config.stage}/local${
    local.port !== 13557 ? "?_port=" + local.port : ""
  }`;
  console.log("SST Console:", url);
  // openBrowser(url);
}

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

  const cdkOptions = {
    ...cliInfo.cdkOptions,
    app: [
      "node",
      "bin/index.mjs",
      config.name,
      config.stage,
      config.region,
      // wrap paths in quotes to handle spaces in user's appPath
      `"${paths.appPath}"`,
    ].join(" "),
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
    throw new Error(`Failed to deploy the debug stack`);
  } else if (!deployRet[0].outputs || !deployRet[0].outputs.Endpoint) {
    throw new Error(`Failed to get the endpoint from the deployed debug stack`);
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
  validatePropsForJs(config);

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
      path.resolve(paths.appPath, argv.outputsFile),
      cliInfo.cdkOptions
    );
  }

  return { deployRet };
}

////////////////////
// Util functions //
////////////////////

async function updateSiteEnvironmentOutputs(evt) {
  const deployRet = evt.properties.stacksData;

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
    const stackData = deployRet.find(({ id }) => id === stack);
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

function buildInvokeEnv(reqEnv) {
  // Get system env
  const systemEnv = { ...process.env };
  // Note: AWS_PROFILE is defined if users run `AWS_PROFILE=xx sst start`, and in
  //       aws sdk v3, AWS_PROFILE takes precedence over AWS_ACCESS_KEY_ID and
  //       AWS_SECRET_ACCESS_KEY. Hence we need to remove it to ensure the invoked
  //       function uses the IAM credentials from the remote Lambda.
  delete systemEnv.AWS_PROFILE;
  // Note: AWS_SECURITY_TOKEN is defined if aws-vault is used to manage credentials.
  //       When both the AWS_SECURITY_TOKEN and the AWS credentials from the Lambda
  //       function are set, the credentials are invalid.
  delete systemEnv.AWS_SECURITY_TOKEN;

  const env = {
    ...systemEnv,
    ...reqEnv,
  };

  // Note: Need to merge `NODE_OPTIONS`. Otherwise, if `NODE_OPTIONS` is set in
  //       reqEnv, it would override the systemEnv. VS Code uses `NODE_OPTIONS`
  //       for debugger. Overriding it will result breakpoint not working properly.
  if (
    systemEnv.NODE_OPTIONS !== undefined &&
    reqEnv.NODE_OPTIONS !== undefined
  ) {
    env.NODE_OPTIONS = `${systemEnv.NODE_OPTIONS} ${reqEnv.NODE_OPTIONS}`;
  }
  return env;
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
