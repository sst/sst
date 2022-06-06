// @ts-nocheck
"use strict";

/* eslint-disable */

import path from "path";
import fs from "fs-extra";
import aws from "aws-sdk";
import chalk from "chalk";
import yaml from "js-yaml";
import spawn from "cross-spawn";

import {
  logger as rootLogger,
  getChildLogger,
  initializeLogger,
} from "./logger.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const packageJson = fs.readJsonSync(require.resolve("../package.json"));

const cdkLogger = getChildLogger("cdk");

import { getHelperMessage } from "./errorHelpers.js";
import { makeCancelable } from "./cancelablePromise.js";

const STACK_DEPLOY_STATUS = {
  PENDING: "pending",
  DEPLOYING: "deploying",
  SUCCEEDED: "succeeded",
  UNCHANGED: "unchanged",
  FAILED: "failed",
  SKIPPED: "skipped",
};

const STACK_DESTROY_STATUS = {
  PENDING: "pending",
  REMOVING: "removing",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  SKIPPED: "skipped",
};

function getCdkVersion() {
  return packageJson.dependencies["aws-cdk"];
}

function synth(cdkOptions) {
  logger.debug("synth", cdkOptions);

  // Run `cdk synth`
  const synthPromise = runCdkSynth(cdkOptions);

  // Parse generated CDK stacks
  const finalPromise = synthPromise.then(() => {
    return parseManifest(cdkOptions);
  });

  return makeCancelable(finalPromise, () => {
    // Kill synth process
    synthPromise.cancel();
  });
}

function runCdkSynth(cdkOptions) {
  let child;

  // Log all outputs and parse for error helper message if there is an error
  const allStderrs = [];

  const promise = new Promise((resolve, reject) => {
    // Build cdk context
    const context = [];
    (cdkOptions.context || []).forEach((c) => context.push("-c", c));

    child = spawn(
      process.execPath,
      [
        getCdkBinPath(),
        "synth",
        "--no-version-reporting",
        "--app",
        cdkOptions.app,
        "--output",
        cdkOptions.output,
        "--quiet",
        ...context,
        ...(cdkOptions.roleArn ? ["--role-arn", cdkOptions.roleArn] : []),
        ...(cdkOptions.noColor ? ["--no-color"] : []),
        ...(cdkOptions.verbose === 0 ? [] : ["--verbose"]),
      ],
      {
        stdio: "pipe",
        env: buildCDKSpawnEnv(cdkOptions),
      }
    );

    child.stdout.on("data", (data) => {
      cdkLogger.trace(data.toString());
      process.stdout.write(chalk.grey(data));
    });
    child.stderr.on("data", (data) => {
      const dataStr = data.toString();

      cdkLogger.trace(dataStr);

      // do not print out the following `cdk synth` messages
      if (
        dataStr.includes("Subprocess exited with error 1") ||
        dataStr.includes("Successfully synthesized to") ||
        dataStr.includes("Supply a stack id")
      ) {
        return;
      }

      // print to screen
      process.stderr.write(chalk.grey(data));

      // log stderr
      allStderrs.push(dataStr);
    });
    child.on("exit", function (code) {
      if (code !== 0) {
        let errorHelper = getHelperMessage(allStderrs.join(""));
        errorHelper = errorHelper ? `\n${errorHelper}\n` : errorHelper;
        const error = new Error(
          errorHelper || "There was an error synthesizing your app."
        );
        error.stderr = allStderrs.join("");
        reject(error);
      } else {
        resolve(code);
      }
    });
    child.on("error", function (error) {
      error.stderr = allStderrs.join("");
      cdkLogger.error(error);
      reject(error);
    });
  });

  return makeCancelable(promise, () => {
    child && child.kill();
  });
}

async function diff(cdkOptions, stackIds) {
  logger.debug("diff", cdkOptions);

  const response = spawn.sync(
    process.execPath,
    [
      getCdkBinPath(),
      "diff",
      "--no-version-reporting",
      "--app",
      cdkOptions.app,
      "--output",
      cdkOptions.output,
      ...(cdkOptions.roleArn ? ["--role-arn", cdkOptions.roleArn] : []),
      ...(cdkOptions.noColor ? ["--no-color"] : []),
      ...(cdkOptions.verbose === 0 ? [] : ["--verbose"]),
      ...(stackIds ? [...stackIds] : []),
    ],
    {
      stdio: "inherit",
      env: buildCDKSpawnEnv(cdkOptions),
    }
  );

  // Note: `cdk diff` returns status 1 if any difference is found. We don't
  //       want to the command to fail.
  if (response.status !== 0 && response.status !== 1) {
    throw new Error("There was an error generating the diff.");
  }

  return response;
}

async function bootstrap(cdkOptions) {
  logger.debug("bootstrap");

  const response = spawn.sync(
    process.execPath,
    [
      getCdkBinPath(),
      "bootstrap",
      "--no-version-reporting",
      // use synthesized output, do not synthesize again
      "--app",
      cdkOptions.output,
      ...(cdkOptions.roleArn ? ["--role-arn", cdkOptions.roleArn] : []),
      ...(cdkOptions.noColor ? ["--no-color"] : []),
      ...(cdkOptions.verbose === 0 ? [] : ["--verbose"]),
    ],
    {
      stdio: "inherit",
      env: {
        ...buildCDKSpawnEnv(cdkOptions),
        CDK_NEW_BOOTSTRAP: true,
      },
    }
  );

  if (response.status !== 0) {
    throw new Error("There was an error bootstrapping your AWS account.");
  }

  return response;
}

////////////////////////
// Deploy functions
////////////////////////

async function deployInit(cdkOptions, stackId) {
  // Get all stacks
  let { stacks } = await parseManifest(cdkOptions);

  // Find the stack to be deployed
  if (stackId) {
    stacks = stacks.filter(({ id }) => id === stackId);
    // validate stack exists
    if (stacks.length === 0) {
      throw new Error(`Stack ${stackId} is not found in your app.`);
    }
    // clear dependencies since we are deploying a single stack
    stacks[0].dependencies = [];
  }

  // Build initial state
  const stackStates = stacks.map(({ id, name, region, dependencies }) => ({
    id,
    name,
    status: STACK_DEPLOY_STATUS.PENDING,
    dependencies,
    account: undefined,
    region,
    startedAt: undefined,
    endedAt: undefined,
    events: [],
    eventsFirstEventAt: undefined,
    errorMessage: undefined,
    outputs: undefined,
  }));

  // Ensure bootstrap stacks are not stuck in REVIEW_IN_PROGRESS state
  await checkInReviewBootstrapStacks(cdkOptions, stackStates);

  return { stackStates, isCompleted: false };
}

async function deployPoll(cdkOptions, stackStates) {
  const deployStacks = async () => {
    let hasSucceededStack = false;

    const statusesByStackId = {};
    stackStates.forEach(({ id, status }) => {
      statusesByStackId[id] = status;
    });

    await Promise.all(
      stackStates
        .filter(
          (stackState) => stackState.status === STACK_DEPLOY_STATUS.PENDING
        )
        .filter((stackState) =>
          stackState.dependencies.every(
            (dep) =>
              ![
                STACK_DEPLOY_STATUS.PENDING,
                STACK_DEPLOY_STATUS.DEPLOYING,
              ].includes(statusesByStackId[dep])
          )
        )
        .map(async (stackState) => {
          try {
            const { status, statusReason, account, outputs, exports } =
              cdkOptions.deployStrategy === "CLOUDFORMATION"
                ? await deployStackTemplate(cdkOptions, stackState)
                : await deployStack(cdkOptions, stackState);
            stackState.status = status;
            stackState.startedAt = Date.now();
            stackState.account = account;
            stackState.outputs = outputs;
            stackState.exports = exports;

            if (status === STACK_DEPLOY_STATUS.DEPLOYING) {
              // wait
            } else if (status === STACK_DEPLOY_STATUS.UNCHANGED) {
              stackState.endedAt = stackState.startedAt;
              hasSucceededStack = true;
              logger.info(
                chalk.green(`\n ✅  ${stackState.name} (no changes)\n`)
              );
            } else if (
              status === STACK_DEPLOY_STATUS.FAILED &&
              statusReason === "no_resources"
            ) {
              stackState.endedAt = stackState.startedAt;
              stackState.errorMessage = `The ${stackState.name} stack contains no resources.`;
              skipPendingStacks();
              logger.info(
                chalk.red(
                  `\n ❌  ${chalk.bold(stackState.name)} failed: ${
                    stackState.errorMessage
                  }\n`
                )
              );
            } else if (
              status === STACK_DEPLOY_STATUS.FAILED &&
              statusReason === "not_bootstrapped"
            ) {
              // reset to pending, bootstrap, and try deploy again on next cycle
              stackState.status = STACK_DEPLOY_STATUS.PENDING;
              try {
                await bootstrap(cdkOptions);
              } catch (bootstrapEx) {
                logger.debug(
                  `Bootstrap stack ${stackState.name} exception ${bootstrapEx}`
                );
                if (isRetryableException(bootstrapEx)) {
                  // retry
                } else {
                  stackState.status = STACK_DEPLOY_STATUS.FAILED;
                  stackState.startedAt = Date.now();
                  stackState.endedAt = stackState.startedAt;
                  stackState.errorMessage = bootstrapEx.message;
                  skipPendingStacks();
                  logger.info(
                    chalk.red(
                      `\n ❌  ${chalk.bold(
                        stackState.name
                      )} failed: ${bootstrapEx}\n`
                    )
                  );
                }
              }
            } else {
              stackState.endedAt = stackState.startedAt;
              stackState.errorMessage = `The ${stackState.name} stack failed to deploy.`;
              skipPendingStacks();
              logger.info(
                chalk.red(
                  `\n ❌  ${chalk.bold(stackState.name)} failed: ${
                    stackState.errorMessage
                  }\n`
                )
              );
            }
          } catch (deployEx) {
            logger.debug(
              `Deploy stack ${stackState.name} exception ${deployEx}`
            );
            if (isRetryableException(deployEx)) {
              // retry
            } else {
              stackState.status = STACK_DEPLOY_STATUS.FAILED;
              stackState.startedAt = Date.now();
              stackState.endedAt = stackState.startedAt;
              stackState.errorMessage = deployEx.message;
              skipPendingStacks();
              logger.info(
                chalk.red(
                  `\n ❌  ${chalk.bold(stackState.name)} failed: ${deployEx}\n`
                )
              );
            }
          }
        })
    );

    if (hasSucceededStack) {
      logger.debug(
        "At least 1 stack successfully deployed, call deployStacks() again"
      );
      await deployStacks();
    }
  };

  const updateDeployStatuses = async () => {
    await Promise.all(
      stackStates
        .filter(
          (stackState) => stackState.status === STACK_DEPLOY_STATUS.DEPLOYING
        )
        .map(async (stackState) => {
          // Get stack events
          try {
            logger.debug(`Fetching stack events ${stackState.name}`);
            await getStackEvents(stackState);
          } catch (e) {
            logger.debug(e);
            if (isRetryableException(e)) {
              // retry
              return;
            }
            // ignore error
          }

          // Get stack status
          try {
            logger.debug(`Checking stack status ${stackState.name}`);
            const { isDeployed, outputs, exports } = await getDeployStatus(
              stackState
            );
            stackState.outputs = outputs;
            stackState.exports = exports;

            if (isDeployed) {
              stackState.status = STACK_DEPLOY_STATUS.SUCCEEDED;
              stackState.endedAt = Date.now();
              logger.info(chalk.green(`\n ✅  ${stackState.name}\n`));
            }
          } catch (statusEx) {
            logger.debug(statusEx);
            if (isRetryableException(statusEx)) {
              // retry
            } else {
              stackState.status = STACK_DEPLOY_STATUS.FAILED;
              stackState.endedAt = Date.now();
              stackState.errorMessage =
                getErrorMessageFromEvents(stackState.events) ||
                statusEx.message;
              stackState.errorHelper = getHelperMessage(
                stackState.errorMessage
              );
              skipPendingStacks();
              logger.info(
                chalk.red(
                  `\n ❌  ${chalk.bold(stackState.name)} failed: ${
                    stackState.errorMessage
                  }\n`
                )
              );
            }
          }
        })
    );
  };

  const skipPendingStacks = () => {
    stackStates
      .filter((stackState) => stackState.status === STACK_DEPLOY_STATUS.PENDING)
      .forEach((stackState) => {
        stackState.status = STACK_DEPLOY_STATUS.SKIPPED;
      });
  };

  const getDeployStatus = async (stackState) => {
    const { name: stackName, region } = stackState;
    const cfn = new aws.CloudFormation({ region });
    const ret = await cfn.describeStacks({ StackName: stackName }).promise();

    // Handle no stack found
    if (ret.Stacks.length === 0) {
      throw new Error(
        `Stack ${stackName} failed to deploy, it is removed while deploying.`
      );
    }

    const { StackStatus, Outputs } = ret.Stacks[0];

    // Case: in progress
    if (StackStatus.endsWith("_IN_PROGRESS")) {
      return { isDeployed: false };
    }

    // Case: stack creation failed
    if (
      StackStatus === "ROLLBACK_COMPLETE" ||
      StackStatus === "ROLLBACK_FAILED"
    ) {
      throw new Error(
        `Stack ${stackName} failed creation, it may need to be manually deleted from the AWS console: ${StackStatus}`
      );
    }

    // Case: stack deploy failed
    if (
      StackStatus !== "CREATE_COMPLETE" &&
      StackStatus !== "UPDATE_COMPLETE"
    ) {
      throw new Error(`Stack ${stackName} failed to deploy: ${StackStatus}`);
    }

    // Case: deploy suceeded
    const outputs = {};
    const exports = {};
    (Outputs || []).forEach(({ OutputKey, OutputValue, ExportName }) => {
      OutputKey && (outputs[OutputKey] = OutputValue);
      ExportName && (exports[ExportName] = OutputValue);
    });
    return { isDeployed: true, outputs, exports };
  };

  const getStackEvents = async (stackState) => {
    // Note: should probably switch to use CDK's built in StackActivity class at some point

    // Stack state props will be modified:
    // - stackState.events
    // - stackState.eventsFirstEventAt

    // Get events
    const cfn = new aws.CloudFormation({ region: stackState.region });
    const ret = await cfn
      .describeStackEvents({ StackName: stackState.name })
      .promise();
    const stackEvents = ret.StackEvents || [];

    // Get the first relevant event
    if (!stackState.eventsFirstEventAt) {
      // look through all the stack events and find the first relevant
      // event which is a "Stack" event and has a CREATE, UPDATE or DELETE status
      const firstRelevantEvent = stackEvents.find((event) => {
        const isStack = "AWS::CloudFormation::Stack";
        const updateIsInProgress = "UPDATE_IN_PROGRESS";
        const createIsInProgress = "CREATE_IN_PROGRESS";
        const deleteIsInProgress = "DELETE_IN_PROGRESS";

        return (
          event.ResourceType === isStack &&
          (event.ResourceStatus === updateIsInProgress ||
            event.ResourceStatus === createIsInProgress ||
            event.ResourceStatus === deleteIsInProgress)
        );
      });

      // set the date some time before the first found
      // stack event of recently issued stack modification
      if (firstRelevantEvent) {
        const eventDate = new Date(firstRelevantEvent.Timestamp);
        const updatedDate = eventDate.setSeconds(eventDate.getSeconds() - 5);
        stackState.eventsFirstEventAt = new Date(updatedDate);
      }
    }

    // Loop through stack events
    const events = stackState.events || [];
    if (stackState.eventsFirstEventAt) {
      const eventsFirstEventAtTs = Date.parse(stackState.eventsFirstEventAt);

      stackEvents.reverse().forEach((event) => {
        // Validate event in range
        const eventInRange =
          eventsFirstEventAtTs <= Date.parse(event.Timestamp);
        if (!eventInRange) {
          return;
        }

        // Validate event not logged
        const eventNotLogged = events.every(
          (loggedEvent) => loggedEvent.eventId !== event.EventId
        );
        if (!eventNotLogged) {
          return;
        }

        // Print new events
        printStackEvent(stackState.name, event);

        // Prepare for next monitoring action
        events.push({
          eventId: event.EventId,
          timestamp: event.Timestamp,
          resourceType: event.ResourceType,
          resourceStatus: event.ResourceStatus,
          resourceStatusReason: event.ResourceStatusReason,
          logicalResourceId: event.LogicalResourceId,
        });
      });
    }
    stackState.events = events;
  };

  const isStatusCompleted = (status) => {
    return ![
      STACK_DEPLOY_STATUS.PENDING,
      STACK_DEPLOY_STATUS.DEPLOYING,
    ].includes(status);
  };

  logger.trace(`Initial stack states: ${JSON.stringify(stackStates)}`);
  await updateDeployStatuses();
  logger.trace(`After update deploy statuses: ${JSON.stringify(stackStates)}`);
  await deployStacks();
  logger.trace(`After deploy stacks: ${JSON.stringify(stackStates)}`);

  return {
    stackStates,
    isCompleted: stackStates.every(({ status }) => isStatusCompleted(status)),
  };
}

async function deployStack(cdkOptions, stackState) {
  const { id: stackId, name: stackName, region } = stackState;
  logger.debug("deploy stack: started", stackName);

  //////////////////////
  // Verify stack is not IN_PROGRESS
  //////////////////////
  logger.debug("deploy stack: get pre-deploy status");
  let stackRet;
  let stackLastUpdatedTime = 0;
  try {
    // Get stack
    const ret = await describeStackWithRetry({ stackName, region });
    stackRet = ret.Stacks[0];

    // Check stack status
    const { StackStatus, LastUpdatedTime } = stackRet;
    logger.debug("deploy stack: get pre-deploy status:", {
      StackStatus,
      LastUpdatedTime,
    });
    if (StackStatus.endsWith("_IN_PROGRESS")) {
      throw new Error(
        `Stack ${stackName} is in the ${StackStatus} state. It cannot be deployed.`
      );
    }
    stackLastUpdatedTime = LastUpdatedTime ? Date.parse(LastUpdatedTime) : 0;
  } catch (e) {
    if (isStackNotExistException(e)) {
      logger.debug("deploy stack: get pre-deploy status: stack does not exist");
      // ignore => new stack
    } else {
      logger.debug("deploy stack: get pre-deploy status: caught exception");
      logger.error(e);
      throw e;
    }
  }

  //////////////////////
  // Add removed stack exports that are still in use
  //////////////////////
  try {
    await addInUseExports({ cdkOptions, region, stackId, stackRet });
  } catch (e) {
    logger.debug("deploy stack: failed to add in-use exports");
  }

  //////////////////////
  // Check template changed
  //////////////////////
  if (
    !(await isTemplateChanged({
      cdkOptions,
      region,
      stackId,
      stackName,
      stackRet,
    }))
  ) {
    return buildDeployResponse({
      stackName,
      stackRet,
      status: STACK_DEPLOY_STATUS.UNCHANGED,
    });
  }

  //////////////////
  // Start deploy
  //////////////////
  logger.debug("deploy stack: run cdk deploy");
  let cpCode;
  let cpStdChunks = [];
  const args = [
    getCdkBinPath(),
    "deploy",
    stackId,
    "--no-version-reporting",
    // use synthesized output, do not synthesize again
    "--app",
    cdkOptions.output,
    "--rollback",
    cdkOptions.rollback === true ? "true" : "false",
    // deploy the stack only, otherwise stacks in dependencies will also be deployed
    "--exclusively",
    // execute changeset without manual security review
    "--require-approval",
    "never",
    // execute changeset without manual change review
    "--execute",
    "true",
    // configure color for CDK CLI (CDK uses the 'colors' module)
    ...(cdkOptions.roleArn ? ["--role-arn", cdkOptions.roleArn] : []),
    ...(cdkOptions.noColor ? ["--no-color"] : []),
    ...(cdkOptions.verbose === 0 ? [] : ["--verbose"]),
  ];
  const cp = spawn(process.execPath, args, {
    stdio: "pipe",
    env: buildCDKSpawnEnv(cdkOptions),
  });
  cp.stdout.on("data", (data) => {
    cpStdChunks.push({ stream: process.stdout, data });
    logger.trace("deploy stack: run cdk deploy: stdout:", data.toString());
  });
  cp.stderr.on("data", (data) => {
    cpStdChunks.push({ stream: process.stderr, data });
    logger.trace("deploy stack: run cdk deploy: stderr:", data.toString());
  });
  cp.on("close", (code) => {
    logger.debug("deploy stack: run cdk deploy: exited with code", code);
    cpCode = code;
  });

  /////////////////////////////////////
  // Wait for new CF events, this means deploy started
  // - case 1: `cdk deploy` failed before CF update started
  // - case 2: `cdk deploy` failed after CF update started
  // - case 3: `cdk deploy` succeeded before CF update started
  // - case 4: `cdk deploy` succeeded after CF update started
  /////////////////////////////////////
  logger.debug("deploy stack:", "poll stack status");
  let cfUpdateWillStart = false;
  let cfUpdateStarted = false;
  let waitForCp = true;
  do {
    try {
      // Get stack
      const ret = await describeStackWithRetry({ stackName, region });
      stackRet = ret.Stacks[0];

      const { StackStatus, LastUpdatedTime } = stackRet;
      logger.debug("deploy stack: poll stack status:", {
        StackStatus,
        LastUpdatedTime,
      });

      // CDK has generated CF changeset, but the has not executed it => wait
      if (StackStatus === "REVIEW_IN_PROGRESS") {
        cfUpdateWillStart = true;
      }
      // CDK detected stack is in DELETE_FAILED state, and will try to delete before deploy => wait
      else if (StackStatus === "DELETE_IN_PROGRESS") {
        cfUpdateWillStart = true;
      }
      // We know stack update has started if either
      // - stack status ends with IN_PROGRESS ie. UPDATE_IN_PROGRESS or UPDATE_ROLLBACK_IN_PROGRESS (except REVIEW_IN_PROGRESS b/c it is a intermediate short-lived status, and the actual deployment has not started.
      // - stack's LastUpdatedTime has change ie. stack already finished to update when we checked
      else {
        cfUpdateWillStart = false;
        cfUpdateStarted =
          StackStatus.endsWith("_IN_PROGRESS") ||
          (LastUpdatedTime &&
            Date.parse(LastUpdatedTime) > stackLastUpdatedTime);
      }
    } catch (e) {
      if (isStackNotExistException(e)) {
        // ignore => no resources in stack OR deployment not started yet
      } else {
        logger.debug("deploy stack: poll stack status: caught exception");
        logger.error(e);
        throw e;
      }
    }

    // Stack status is in an intermediate state => wait and check again
    if (cfUpdateWillStart) {
      logger.debug("deploy stack: poll stack status: cf update will start");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    // Stack status updated (case 2, 4) => stop the CDK process and we will manually poll for stack status
    else if (cfUpdateStarted) {
      logger.debug("deploy stack: poll stack status: cf update started");
      cp.kill();
      waitForCp = false;
    }
    // Stack status NOT updated + cp has exited (case 1, 3) => stack deployed or failed, print out CDK output
    else if (cpCode !== undefined) {
      logger.debug("deploy stack: poll stack status: cp exited");
      waitForCp = false;
    }
    // `cdk deploy` is still running and stack update has not started => wait and check again
    else {
      logger.debug("deploy stack: poll stack status: unknown");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } while (waitForCp);

  //////////////////////
  // Build status
  //////////////////////
  let status, statusReason;

  // CF update started
  if (cfUpdateStarted) {
    status = STACK_DEPLOY_STATUS.DEPLOYING;
  }
  // CF update NOT started + Deploy succeeded
  else if (cpCode === 0) {
    // Deploy succeeded + CF update exists => stack update to update, nothing needed to deploy
    if (stackRet) {
      status = STACK_DEPLOY_STATUS.UNCHANGED;
    }
    // Deploy succeeded + CF NOT exists => stack has no resource, CDK did not deploy
    else {
      status = STACK_DEPLOY_STATUS.FAILED;
      statusReason = "no_resources";
    }
  }
  // CF update NOT started + Deploy failed
  else {
    status = STACK_DEPLOY_STATUS.FAILED;
    const stdOutput = cpStdChunks.map(({ data }) => data.toString()).join("");
    // Deploy failed due to not bootstrapped => do not print out error, will bootstrap
    // ie. "Has the environment been bootstrapped? Please run 'cdk bootstrap'"
    // ie. "This CDK deployment requires bootstrap stack version '6', found '5'. Please run 'cdk bootstrap'."
    if (stdOutput.indexOf("Please run 'cdk bootstrap'") > -1) {
      statusReason = "not_bootstrapped";
    }
    // Deploy failed due to other errors => print out error
    else {
      cpStdChunks.forEach(({ stream, data }) => stream.write(data));
    }
  }

  return buildDeployResponse({ stackName, stackRet, status, statusReason });
}

async function deployStackTemplate(cdkOptions, stackState) {
  const { name: stackName, region } = stackState;
  const cfn = new aws.CloudFormation({ region });

  logger.debug("deploy stack template: started", stackName);

  //////////////////////
  // Verify stack is not IN_PROGRESS
  //////////////////////
  logger.debug("deploy stack template: get pre-deploy status");
  let stackRet;
  try {
    // Get stack
    const ret = await describeStackWithRetry({ stackName, region });
    stackRet = ret.Stacks[0];

    // Check stack status
    const { StackStatus, LastUpdatedTime } = stackRet;
    logger.debug("deploy stack template: get pre-deploy status:", {
      StackStatus,
      LastUpdatedTime,
    });
    if (StackStatus.endsWith("_IN_PROGRESS")) {
      throw new Error(
        `Stack ${stackName} is in the ${StackStatus} state. It cannot be deployed.`
      );
    }
  } catch (e) {
    if (isStackNotExistException(e)) {
      // ignore => new stack
    } else {
      logger.debug(
        "deploy stack template: get pre-deploy status: caught exception"
      );
      logger.error(e);
      throw e;
    }
  }

  //////////////////
  // Start deploy
  //////////////////
  let noChanges = false;

  // Get command file
  const commandFilePath = path.join(cdkOptions.output, `${stackName}.command`);
  const hasCommandData = await fs.existsSync(commandFilePath);

  // Command file exists, CDK would've deployed the stack
  if (hasCommandData) {
    const commandData = await fs.readJson(commandFilePath);
    if (commandData.isUpdate) {
      try {
        await cfn.updateStack(commandData.params).promise();
      } catch (e) {
        if (
          e.code === "ValidationError" &&
          e.message === "No updates are to be performed."
        ) {
          // ignore => no changes
          noChanges = true;
        } else {
          logger.debug(
            "deploy stack template: get updateStack status: caught exception"
          );
          logger.error(e);
          throw e;
        }
      }
    } else {
      await cfn.createStack(commandData.params).promise();
    }
  }
  // Command file does NOT exist, CDK would've skipped this stack
  else {
    // ignore => no changes
    noChanges = true;
  }

  //////////////////////
  // Build status
  //////////////////////
  let status, statusReason;

  // Get stack
  try {
    const ret = await describeStackWithRetry({ stackName, region });
    stackRet = ret.Stacks[0];
  } catch (e) {
    if (isStackNotExistException(e)) {
      // ignore => new stack
    } else {
      logger.debug(
        "deploy stack template: get post-deploy status: caught exception"
      );
      logger.error(e);
      throw e;
    }
  }

  if (!stackRet) {
    status = STACK_DEPLOY_STATUS.FAILED;
    statusReason = "no_resources";
  } else if (noChanges) {
    status = STACK_DEPLOY_STATUS.UNCHANGED;
  } else {
    status = STACK_DEPLOY_STATUS.DEPLOYING;
  }

  return buildDeployResponse({ stackName, stackRet, status, statusReason });
}

async function checkInReviewBootstrapStacks(cdkOptions, stackStates) {
  logger.debug("checkInReviewBootstrapStacks");

  // Check bootstrap stacks in each region
  const regions = stackStates.map(({ region }) => region);
  const uniqueRegions = regions.filter((x, i) => i === regions.indexOf(x));
  await Promise.all(
    uniqueRegions.map((region) =>
      checkInReviewBootstrapStackInRegion(cdkOptions, region)
    )
  );
}

async function checkInReviewBootstrapStackInRegion(cdkOptions, region) {
  logger.debug("checkInReviewBootstrapStackInRegion", region);

  // Get existing bootstrap stack
  const stackName = "CDKToolkit";
  let stack;
  try {
    const ret = await describeStackWithRetry({ region, stackName });
    stack = ret.Stacks[0];
  } catch (e) {
    if (isStackNotExistException(e)) {
      logger.debug(
        "checkInReviewBootstrapStackInRegion: bootstrap stack does not exist"
      );
    } else {
      logger.debug(
        "checkInReviewBootstrapStackInRegion: bootstrap stack describe error"
      );
      logger.debug(e);
    }
    // ignore
  }

  // Remove existing bootstrap stack if stuck in REVIEW_IN_PROGERESS
  if (
    stack &&
    stack.StackStatus === "REVIEW_IN_PROGRESS" &&
    Date.parse(stack.CreationTime) < Date.now() - 60000
  ) {
    logger.debug(
      "checkInReviewBootstrapStackInRegion: removing bootstrap stack"
    );
    await deleteStackWithRetry({ region, stackName });
  }
}

async function isTemplateChanged({
  cdkOptions,
  region,
  stackId,
  stackName,
  stackRet,
}) {
  logger.debug("deploy stack: isTemplateChanged");

  // Check if updating an existing stack and if the stack is in a COMPLETE state.
  // Note: we only want to perform this optimization if the stack was previously
  //       successfully deployed.
  if (
    stackRet &&
    ["CREATE_COMPLETE", "UPDATE_COMPLETE"].includes(stackRet.StackStatus)
  ) {
    try {
      // Get new template
      const newTemplateStr = await getLocalTemplate(cdkOptions, stackId);
      const newTemplateObj = yaml.load(newTemplateStr);
      const newTemplateYml = yaml.dump(newTemplateObj);
      // Return template changed (`true`) if template Parameters contain
      // SSM values. B/c the SSM values could have changed while the
      // template remains the same.
      const hasSSMParam = Object.entries(newTemplateObj.Parameters || {})
        .filter(([key]) => key !== "BootstrapVersion")
        .find(([, value]) => value.Type.startsWith("AWS::SSM::Parameter"));
      if (hasSSMParam) {
        logger.debug("deploy stack: isTemplateChanged: has SSM in Parameters");
        return true;
      }
      // Get existing template
      const templateRet = await getStackTemplateWithRetry({
        stackName,
        region,
      });
      const existingTemplateYml = yaml.dump(
        yaml.load(templateRet.TemplateBody)
      );
      logger.debug(existingTemplateYml);
      logger.debug(newTemplateYml);
      if (
        existingTemplateYml &&
        newTemplateYml &&
        existingTemplateYml === newTemplateYml
      ) {
        logger.debug("deploy stack: isTemplateChanged: unchanged");
        return false;
      }
    } catch (e) {
      // ignore error
      logger.debug("deploy stack: isTemplateChanged: caught exception", e);
    }
  }

  return true;
}

async function addInUseExports({ cdkOptions, region, stackId, stackRet }) {
  logger.debug("deploy stack: addInUseExports");

  // Note that we only want to handle outputs exported by CDK.

  if (!stackRet) {
    return;
  }

  // Get new exports
  // ie.
  // "Outputs": {
  //   "ExportsOutputRefauthUserPoolA78B038B8D9965B5": {
  //     "Value": {
  //       "Ref": "authUserPoolA78B038B"
  //     },
  //     "Export": {
  //       "Name": "frank-acme-auth:ExportsOutputRefauthUserPoolA78B038B8D9965B5"
  //     }
  //   },
  const newTemplate = JSON.parse(await getLocalTemplate(cdkOptions, stackId));
  const newOutputs = newTemplate.Outputs || {};
  const newExportNames = [];
  Object.keys(newOutputs)
    .filter((outputKey) => outputKey.startsWith("ExportsOutput"))
    .filter((outputKey) => newOutputs[outputKey].Export)
    .forEach((outputKey) => {
      newExportNames.push(newOutputs[outputKey].Export.Name);
    });

  // Get current exports
  // ie.
  // Outputs [{
  //   OutputKey: (String)
  //   OutputValue: (String)
  //   Description: (String)
  //   ExportName: (String)
  // }]
  let isDirty = false;
  await Promise.all(
    stackRet.Outputs.filter((output) =>
      output.OutputKey.startsWith("ExportsOutput")
    )
      .filter((output) => output.ExportName)
      // filter exports not in the new template (ie. CloudFormation will be removing)
      .filter((output) => !newExportNames.includes(output.ExportName))
      // filter the exports still in-use by other stacks
      .map(async ({ ExportName, OutputKey, OutputValue }) => {
        const ret = await listImportsWithRetry({
          region,
          exportName: ExportName,
        });
        // update template
        if (ret.Imports.length > 0) {
          logger.debug(
            `deploy stack: addInUseExports: export ${ExportName} used in ${ret.Imports.join(
              ", "
            )}`
          );
          newTemplate.Outputs = newTemplate.Outputs || {};
          newTemplate.Outputs[OutputKey] = {
            Description: `Output added by SST b/c exported value still used in ${ret.Imports.join(
              ", "
            )}`,
            Value: OutputValue,
            Export: {
              Name: ExportName,
            },
          };
          isDirty = true;
        }
      })
  );

  // Save new template
  if (isDirty) {
    await saveLocalTemplate(
      cdkOptions,
      stackId,
      JSON.stringify(newTemplate, null, 2)
    );
  }
}

function buildDeployResponse({ stackName, stackRet, status, statusReason }) {
  let account, outputs, exports;

  if (stackRet) {
    const { StackId, Outputs } = stackRet;
    // ie. StackId
    // arn:aws:cloudformation:us-east-1:112233445566:stack/prod-stack/c2a01ac0-61f1-11eb-8f66-0e3ca42a281f"
    const StackIdParts = StackId.split(":");
    account = StackIdParts[4];
    // ie. Outputs
    // [{
    //   "OutputKey": "MyKey",
    //   "OutputValue": "MyValue"
    //   "ExportName": "MyExportName"
    // }]
    outputs = {};
    exports = {};
    Outputs.forEach(({ OutputKey, OutputValue, ExportName }) => {
      outputs[OutputKey] = OutputValue;
      if (ExportName) {
        exports[ExportName] = OutputValue;
      }
    });
  }

  logger.debug("deploy stack:", "done", stackName, {
    status,
    statusReason,
    account,
    outputs,
    exports,
  });

  return { status, statusReason, account, outputs, exports };
}

async function getLocalTemplate(cdkOptions, stackId) {
  const fileName = `${stackId}.template.json`;
  const filePath = path.join(cdkOptions.output, fileName);
  const fileContent = await fs.readFile(filePath);
  return fileContent.toString();
}
async function saveLocalTemplate(cdkOptions, stackId, content) {
  const fileName = `${stackId}.template.json`;
  const filePath = path.join(cdkOptions.output, fileName);
  await fs.writeFile(filePath, content);
}

////////////////////////
// Destroy functions
////////////////////////

async function destroyInit(cdkOptions, stackId) {
  // Get all stacks
  let { stacks } = await parseManifest(cdkOptions);

  // Find the stack to be destroyed
  if (stackId) {
    stacks = stacks.filter(({ id }) => id === stackId);
    // validate stack exists
    if (stacks.length === 0) {
      throw new Error(`Stack ${stackId} is not found in your app.`);
    }
    // clear dependencies since we are deploying a single stack
    stacks[0].dependencies = [];
  }

  // Generate reverse dependency map
  const reverseDependencyMapping = {};
  stacks.forEach(({ id, dependencies }) =>
    dependencies.forEach((dep) => {
      reverseDependencyMapping[dep] = reverseDependencyMapping[dep] || [];
      reverseDependencyMapping[dep].push(id);
    })
  );

  // Build initial state
  const stackStates = stacks.map(({ id, name, region }) => ({
    id,
    name,
    status: STACK_DESTROY_STATUS.PENDING,
    dependencies: reverseDependencyMapping[name] || [],
    region,
    events: [],
    eventsFirstEventAt: undefined,
    errorMessage: undefined,
  }));

  return { stackStates, isCompleted: false };
}

async function destroyPoll(cdkOptions, stackStates) {
  const destroyStacks = async () => {
    let hasSucceededStack = false;

    const statusesByStackId = {};
    stackStates.forEach(({ id, status }) => {
      statusesByStackId[id] = status;
    });

    await Promise.all(
      stackStates
        .filter(
          (stackState) => stackState.status === STACK_DESTROY_STATUS.PENDING
        )
        .filter((stackState) =>
          stackState.dependencies.every(
            (dep) => statusesByStackId[dep] === STACK_DESTROY_STATUS.SUCCEEDED
          )
        )
        .map(async (stackState) => {
          try {
            const { status } =
              cdkOptions.destroyStrategy === "CLOUDFORMATION"
                ? await destroyStackTemplate(cdkOptions, stackState)
                : await destroyStack(cdkOptions, stackState);
            stackState.status = status;

            if (status === STACK_DESTROY_STATUS.REMOVING) {
              // wait
            } else if (status === STACK_DESTROY_STATUS.SUCCEEDED) {
              hasSucceededStack = true;
              logger.info(chalk.green(`\n ✅  ${stackState.name}\n`));
            } else {
              stackState.errorMessage = `The ${stackState.name} stack failed to destroy.`;
              skipPendingStacks();
              logger.info(
                chalk.red(
                  `\n ❌  ${chalk.bold(stackState.name)} failed: ${
                    stackState.errorMessage
                  }\n`
                )
              );
            }
          } catch (e) {
            logger.debug(`Destroy stack ${stackState.name} exception ${e}`);
            if (isRetryableException(e)) {
              // retry
            } else {
              stackState.status = STACK_DESTROY_STATUS.FAILED;
              stackState.errorMessage = e.message;
              skipPendingStacks();
              logger.info(
                chalk.red(
                  `\n ❌  ${chalk.bold(stackState.name)} failed: ${e}\n`
                )
              );
            }
          }
        })
    );

    if (hasSucceededStack) {
      logger.debug(
        "At least 1 stack successfully destroyed, call destroyStacks() again"
      );
      await destroyStacks();
    }
  };

  const updateDestroyStatuses = async () => {
    await Promise.all(
      stackStates
        .filter(
          (stackState) => stackState.status === STACK_DESTROY_STATUS.REMOVING
        )
        .map(async (stackState) => {
          // Get stack events
          try {
            logger.debug(`Fetching stack events ${stackState.name}`);
            await getStackEvents(stackState);
          } catch (eventsEx) {
            logger.debug(eventsEx);
            if (isRetryableException(eventsEx)) {
              // retry
              return;
            } else if (isStackNotExistException(eventsEx)) {
              // ignore
              stackState.status = STACK_DESTROY_STATUS.SUCCEEDED;
              logger.info(chalk.green(`\n ✅  ${stackState.name}\n`));
              return;
            }
            // ignore error
          }

          // Get stack status
          try {
            logger.debug(`Checking stack status ${stackState.name}`);
            const { isDestroyed } = await getDestroyStatus(stackState);

            if (isDestroyed) {
              stackState.status = STACK_DESTROY_STATUS.SUCCEEDED;
              logger.info(chalk.green(`\n ✅  ${stackState.name}\n`));
            }
          } catch (statusEx) {
            logger.debug(statusEx);
            if (isRetryableException(statusEx)) {
              // retry
            } else if (isStackNotExistException(statusEx)) {
              stackState.status = STACK_DESTROY_STATUS.SUCCEEDED;
              logger.info(chalk.green(`\n ✅  ${stackState.name}\n`));
            } else {
              stackState.status = STACK_DESTROY_STATUS.FAILED;
              stackState.errorMessage =
                getErrorMessageFromEvents(stackState.events) ||
                statusEx.message;
              skipPendingStacks();
              logger.info(
                chalk.red(
                  `\n ❌  ${chalk.bold(stackState.name)} failed: ${
                    stackState.errorMessage
                  }\n`
                )
              );
            }
          }
        })
    );
  };

  const skipPendingStacks = () => {
    stackStates
      .filter(
        (stackState) => stackState.status === STACK_DESTROY_STATUS.PENDING
      )
      .forEach((stackState) => {
        stackState.status = STACK_DESTROY_STATUS.SKIPPED;
      });
  };

  const getDestroyStatus = async (stackState) => {
    let isDestroyed;
    const { name: stackName, region } = stackState;
    const cfn = new aws.CloudFormation({ region });
    const ret = await cfn.describeStacks({ StackName: stackName }).promise();

    // Handle no stack found
    if (ret.Stacks.length === 0) {
      isDestroyed = true;
    } else {
      const { StackStatus } = ret.Stacks[0];

      // Case: in progress
      if (StackStatus.endsWith("_IN_PROGRESS")) {
        isDestroyed = false;
      }
      // Case: destroy succeeded
      else if (StackStatus === "DELETE_COMPLETE") {
        isDestroyed = true;
      }
      // Case: destroy failed
      else {
        throw new Error(`Stack ${stackName} failed to destroy: ${StackStatus}`);
      }
    }

    return { isDestroyed };
  };

  const getStackEvents = async (stackState) => {
    const { name: stackName, region } = stackState;
    // Note: should probably switch to use CDK's built in StackActivity class at some point

    // Stack state props will be modified:
    // - stackState.events
    // - stackState.eventsFirstEventAt

    // Get events
    const cfn = new aws.CloudFormation({ region: region });
    const ret = await cfn
      .describeStackEvents({ StackName: stackName })
      .promise();
    const stackEvents = ret.StackEvents || [];

    // Get the first relevant event
    if (!stackState.eventsFirstEventAt) {
      // look through all the stack events and find the first relevant
      // event which is a "Stack" event and has a CREATE, UPDATE or DELETE status
      const firstRelevantEvent = stackEvents.find((event) => {
        const isStack = "AWS::CloudFormation::Stack";
        const updateIsInProgress = "UPDATE_IN_PROGRESS";
        const createIsInProgress = "CREATE_IN_PROGRESS";
        const deleteIsInProgress = "DELETE_IN_PROGRESS";

        return (
          event.ResourceType === isStack &&
          (event.ResourceStatus === updateIsInProgress ||
            event.ResourceStatus === createIsInProgress ||
            event.ResourceStatus === deleteIsInProgress)
        );
      });

      // set the date some time before the first found
      // stack event of recently issued stack modification
      if (firstRelevantEvent) {
        const eventDate = new Date(firstRelevantEvent.Timestamp);
        const updatedDate = eventDate.setSeconds(eventDate.getSeconds() - 5);
        stackState.eventsFirstEventAt = new Date(updatedDate);
      }
    }

    // Loop through stack events
    const events = stackState.events || [];
    if (stackState.eventsFirstEventAt) {
      const eventsFirstEventAtTs = Date.parse(stackState.eventsFirstEventAt);

      stackEvents.reverse().forEach((event) => {
        // Validate event in range
        const eventInRange = eventsFirstEventAtTs <= event.Timestamp;
        if (!eventInRange) {
          return;
        }

        // Validate event not logged
        const eventNotLogged = events.every(
          (loggedEvent) => loggedEvent.eventId !== event.EventId
        );
        if (!eventNotLogged) {
          return;
        }

        // Print new events
        printStackEvent(stackState.name, event);

        // Prepare for next monitoring action
        events.push({
          eventId: event.EventId,
          timestamp: event.Timestamp,
          resourceType: event.ResourceType,
          resourceStatus: event.ResourceStatus,
          resourceStatusReason: event.ResourceStatusReason,
          logicalResourceId: event.LogicalResourceId,
        });
      });
    }
    stackState.events = events;
  };

  const isStatusCompleted = (status) => {
    return ![
      STACK_DESTROY_STATUS.PENDING,
      STACK_DESTROY_STATUS.REMOVING,
    ].includes(status);
  };

  logger.trace(`Initial stack states: ${JSON.stringify(stackStates)}`);
  await updateDestroyStatuses();
  logger.trace(`After update destroy statuses: ${JSON.stringify(stackStates)}`);
  await destroyStacks();
  logger.trace(`After destroy stacks: ${JSON.stringify(stackStates)}`);

  return {
    stackStates,
    isCompleted: stackStates.every(({ status }) => isStatusCompleted(status)),
  };
}

async function destroyStack(cdkOptions, stackState) {
  const { id: stackId, name: stackName, region } = stackState;
  logger.debug("destroy stack:", "started", stackName);

  //////////////////////
  // Verify stack is not IN_PROGRESS
  //////////////////////
  logger.debug("destroy stack:", "get pre-deploy status");
  let stackLastUpdatedTime = 0;
  try {
    // Get stack
    const stackRet = await describeStackWithRetry({ stackName, region });

    // Check stack status
    const { StackStatus, LastUpdatedTime } = stackRet.Stacks[0];
    if (StackStatus.endsWith("_IN_PROGRESS")) {
      throw new Error(
        `Stack ${stackName} is in the ${StackStatus} state. It cannot be destroyed.`
      );
    }
    stackLastUpdatedTime = LastUpdatedTime ? Date.parse(LastUpdatedTime) : 0;
  } catch (e) {
    if (isStackNotExistException(e)) {
      // already removed
      return { status: STACK_DESTROY_STATUS.SUCCEEDED };
    } else {
      logger.error(e);
      throw e;
    }
  }

  //////////////////
  // Start destroy
  //////////////////
  logger.debug("destroy stack:", "run cdk destroy");
  let cpCode;
  let cpStdChunks = [];
  const cp = spawn(
    process.execPath,
    [
      getCdkBinPath(),
      "destroy",
      stackId,
      "--no-version-reporting",
      "--app",
      cdkOptions.output,
      "--force",
      // deploy the stack only, otherwise stacks in dependencies will also be destroyed
      "--exclusively",
      // execute changeset without manual review
      "--execute",
      "true",
      ...(cdkOptions.roleArn ? ["--role-arn", cdkOptions.roleArn] : []),
      ...(cdkOptions.noColor ? ["--no-color"] : []),
      ...(cdkOptions.verbose === 0 ? [] : ["--verbose"]),
    ],
    {
      stdio: "pipe",
      env: buildCDKSpawnEnv(cdkOptions),
    }
  );
  cp.stdout.on("data", (data) =>
    cpStdChunks.push({ stream: process.stdout, data })
  );
  cp.stderr.on("data", (data) =>
    cpStdChunks.push({ stream: process.stderr, data })
  );
  cp.on("close", (code) => {
    logger.debug(`cdk destroy exited with code ${code}`);
    cpCode = code;
  });

  /////////////////////////////////////
  // Wait for new CF events, this means destroy started
  // - case 1: `cdk destroy` failed before CF update started
  // - case 2: `cdk destroy` failed after CF update started
  // - case 3: `cdk destroy` succeeded before CF update started
  // - case 4: `cdk destroy` succeeded after CF update started
  /////////////////////////////////////
  logger.debug("destroy stack:", "poll stack status");
  let stackRet;
  let cfUpdateStarted = false;
  let waitForCp = true;
  do {
    try {
      // Get stack
      stackRet = await describeStackWithRetry({ stackName, region });

      // We know stack update has started if either
      // - stack status ends with IN_PROGRESS ie. UPDATE_IN_PROGRESS or UPDATE_ROLLBACK_IN_PROGRESS (except REVIEW_IN_PROGRESS b/c it is a intermediate short-lived status, and the actual deployment has not started.
      // - stack's LastUpdatedTime has change ie. stack already finished to update when we checked
      const { StackStatus, LastUpdatedTime } = stackRet.Stacks[0];
      cfUpdateStarted =
        (StackStatus.endsWith("_IN_PROGRESS") &&
          StackStatus !== "REVIEW_IN_PROGRESS") ||
        (LastUpdatedTime && Date.parse(LastUpdatedTime) > stackLastUpdatedTime);
    } catch (e) {
      if (isStackNotExistException(e)) {
        // already removed
        return { status: STACK_DESTROY_STATUS.SUCCEEDED };
      } else {
        logger.error(e);
        throw e;
      }
    }

    // If case 2, 4: Stack status updated => stop the CDK process and we will manually poll for stack status
    if (cfUpdateStarted) {
      cp.kill();
      waitForCp = false;
    }
    // If Case 1, 3: Stack status NOT updated + cp has exited => stack destroyed or failed
    else if (cpCode !== undefined) {
      waitForCp = false;
    }
    // Case other: `cdk destroy` is still running and stack update has not started => wait and check again
    else {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } while (waitForCp);

  //////////////////////
  // Build response
  //////////////////////
  let status;

  // CF update started
  if (cfUpdateStarted) {
    status = STACK_DESTROY_STATUS.REMOVING;
  }
  // CF update NOT started + Destroy succeeded
  else if (cpCode === 0) {
    status = STACK_DESTROY_STATUS.SUCCEEDED;
  }
  // CF update NOT started + Destroy failed
  else {
    status = STACK_DESTROY_STATUS.FAILED;
    cpStdChunks.forEach(({ stream, data }) => stream.write(data));
  }

  logger.debug("destroy stack:", "done", stackName, { status });

  return { status };
}

async function destroyStackTemplate(cdkOptions, stackState) {
  const { name: stackName, region } = stackState;
  const cfn = new aws.CloudFormation({ region });

  logger.debug("destroy stack template:", "started", stackName);

  //////////////////////
  // Verify stack is not IN_PROGRESS
  //////////////////////
  logger.debug("destroy stack template:", "get pre-destroy status");
  try {
    // Get stack
    const stackRet = await describeStackWithRetry({ stackName, region });

    // Check stack status
    const { StackStatus, LastUpdatedTime } = stackRet.Stacks[0];
    logger.debug("destroy stack template: get pre-destroy status:", {
      StackStatus,
      LastUpdatedTime,
    });
    if (StackStatus.endsWith("_IN_PROGRESS")) {
      throw new Error(
        `Stack ${stackName} is in the ${StackStatus} state. It cannot be destroyed.`
      );
    }
  } catch (e) {
    if (isStackNotExistException(e)) {
      // already removed
      return { status: STACK_DESTROY_STATUS.SUCCEEDED };
    } else {
      logger.debug(
        "destroy stack template: get pre-destroy destroy: caught exception"
      );
      logger.error(e);
      throw e;
    }
  }

  //////////////////
  // Start destroy
  //////////////////
  logger.debug("destroy stack template:", "run deleteStack");

  try {
    await cfn.deleteStack({ StackName: stackName }).promise();
  } catch (e) {
    logger.debug(
      "destroy stack template: get deleteStack status: caught exception"
    );
    logger.error(e);
    throw e;
  }

  //////////////////////
  // Build response
  //////////////////////
  const status = STACK_DESTROY_STATUS.REMOVING;

  logger.debug("destroy stack template:", "done", stackName, { status });

  return { status };
}

////////////////////////
// Util functions
////////////////////////

/**
 * Finds the path to the CDK package executable by converting the file path of:
 * /Users/spongebob/serverless-stack/node_modules/aws-cdk/package.json
 * to:
 * /Users/spongebob/serverless-stack/node_modules/.bin/cdk
 */
function getCdkBinPath() {
  const pkg = "aws-cdk";
  const filePath = require.resolve(`${pkg}/package.json`);
  if (!filePath) {
    throw new Error(`There was a problem finding ${pkg}`);
  }

  // Note: that as of CDK v2.15.0, "node_modules/aws-cdk/bin/cdk" cannot be invoked
  //  directly on Windows. Need to invoke with node, ie.
  //  "node node_modules/aws-cdk/bin/cdk"
  const binPath = path.join(filePath, "../bin/cdk");
  if (!fs.existsSync(binPath)) {
    throw new Error(
      `There was a problem finding the ${pkg}/bin/sdk entry point`
    );
  }
  return binPath;
}

function buildCDKSpawnEnv(cdkOptions) {
  return {
    ...process.env,

    // disable CDK's notification for newer CDK version found
    CDK_DISABLE_VERSION_CHECK: true,

    // configure color for SST Resources used the 'chalk' module
    // FORCE_COLOR will be passed to sst resources through CDK
    FORCE_COLOR: cdkOptions.noColor ? 0 : 3,
  };
}

async function parseManifest(cdkOptions) {
  const defaultRegion = "us-east-1";
  const stacks = [];

  try {
    // Parse the manifest.json file inside cdk.out
    const manifestPath = path.join(cdkOptions.output, "manifest.json");
    const manifest = await fs.readJson(manifestPath);

    // Loop through each CloudFormation stack
    Object.keys(manifest.artifacts)
      .filter(
        (key) => manifest.artifacts[key].type === "aws:cloudformation:stack"
      )
      .forEach((key) => {
        const { environment, properties, dependencies } =
          manifest.artifacts[key];
        // Parse for region
        // ie. aws://112233445566/us-west-1
        const region = environment.split("/").pop();
        stacks.push({
          id: key,
          name: properties.stackName || key,
          region:
            !region || region === "unknown-region" ? defaultRegion : region,
          dependencies: (dependencies || []).filter(
            (dep) => manifest.artifacts[dep].type === "aws:cloudformation:stack"
          ),
        });
      });
  } catch (e) {
    logger.error("Failed to parse generated manifest.json", e);
  }

  return { stacks };
}

async function describeStackWithRetry({ region, stackName }) {
  let ret;
  try {
    const cfn = new aws.CloudFormation({ region });
    ret = await cfn.describeStacks({ StackName: stackName }).promise();
  } catch (e) {
    if (isRetryableException(e)) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return await describeStackWithRetry({ region, stackName });
    }
    throw e;
  }
  return ret;
}

async function getStackTemplateWithRetry({ region, stackName }) {
  let ret;
  try {
    const cfn = new aws.CloudFormation({ region });
    ret = await cfn
      .getTemplate({
        StackName: stackName,
        TemplateStage: "Original",
      })
      .promise();
  } catch (e) {
    if (isRetryableException(e)) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return await getStackTemplateWithRetry({ region, stackName });
    }
    throw e;
  }
  return ret;
}

async function listImportsWithRetry({ region, exportName }) {
  let ret;
  try {
    const cfn = new aws.CloudFormation({ region });
    ret = await cfn.listImports({ ExportName: exportName }).promise();
  } catch (e) {
    if (
      e.code === "ValidationError" &&
      e.message.includes("is not imported by any stack")
    ) {
      return { Imports: [] };
    }
    if (isRetryableException(e)) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return await listImportsWithRetry({ region, exportName });
    }
    throw e;
  }
  return ret;
}

async function deleteStackWithRetry({ region, stackName }) {
  let ret;
  try {
    const cfn = new aws.CloudFormation({ region });
    ret = await cfn.deleteStack({ StackName: stackName }).promise();
  } catch (e) {
    if (isRetryableException(e)) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return await deleteStackWithRetry({ region, stackName });
    }
    throw e;
  }
  return ret;
}

function colorFromStackEventStatus(status) {
  if (!status) {
    return chalk.reset;
  }

  if (status.indexOf("FAILED") !== -1) {
    return chalk.red;
  }
  if (status.indexOf("ROLLBACK") !== -1) {
    return chalk.yellow;
  }
  if (status.indexOf("COMPLETE") !== -1) {
    return chalk.green;
  }

  return chalk.reset;
}

function printStackEvent(stackName, event) {
  // note: previously we only printed out "ResourceStatusReason" on *_FAILED
  //       events. But sometimes CloudFormation returns "ResourceStatusReason"
  //       on the *_IN_PROGRESS event before the *_FAILED event. And there is
  //       no "ResourceStatusReason" for the *_FAILED event itself. Now, we
  //       will always print out the reason.
  const statusColor = colorFromStackEventStatus(event.ResourceStatus);
  logger.info(
    `${stackName}` +
      ` | ${statusColor(event.ResourceStatus || "")}` +
      ` | ${event.ResourceType}` +
      ` | ${statusColor(chalk.bold(event.LogicalResourceId || ""))}` +
      (event.ResourceStatusReason
        ? ` | ${statusColor(event.ResourceStatusReason || "")}`
        : "")
  );
}

function getErrorMessageFromEvents(events) {
  let errorMessage;

  const latestResourceStatusReasonByLogicalId = {};
  events.some(({ resourceStatus, resourceStatusReason, logicalResourceId }) => {
    // Track the latest reason by logical id
    if (resourceStatusReason) {
      latestResourceStatusReasonByLogicalId[logicalResourceId] =
        resourceStatusReason;
    }

    // On failure, look up the latest reason of the logical id.
    // Note: CloudFormation sometimes set "ResourceStatusReason" on the
    //       *_IN_PROGRESS event before the *_FAILED event.
    if (
      resourceStatus &&
      (resourceStatus.endsWith("FAILED") ||
        resourceStatus.endsWith("ROLLBACK_IN_PROGRESS"))
    ) {
      errorMessage = latestResourceStatusReasonByLogicalId[logicalResourceId];
      // we found the error, can stop now
      return true;
    }

    return false;
  });

  return errorMessage;
}

function isRetryableException(e) {
  return (
    (e.code === "ThrottlingException" && e.message === "Rate exceeded") ||
    (e.code === "Throttling" && e.message === "Rate exceeded") ||
    (e.code === "TooManyRequestsException" &&
      e.message === "Too Many Requests") ||
    e.code === "OperationAbortedException" ||
    e.code === "TimeoutError" ||
    e.code === "NetworkingError"
  );
}

function isStackNotExistException(e) {
  return (
    e.code === "ValidationError" &&
    e.message.startsWith("Stack ") &&
    e.message.endsWith(" does not exist")
  );
}

export * as Util from "./util/index.js";
export { Update } from "./update/index.js";
export { Pothos } from "./pothos/index.js";
export { Packager } from "./packager/index.js";
export { State } from "./state/index.js";
export { Runtime } from "./runtime/index.js";
// export * from "./bridge";
export { Stacks } from "./stacks/index.js";
export * from "./cli/index.js";
export * from "./local/index.js";
export { Telemetry } from "./telemetry/index.js";
export * from "./aws-sdk/index.js";

export const logger = rootLogger;
export {
  diff,
  synth,
  deployInit,
  deployPoll,
  destroyInit,
  destroyPoll,
  getCdkBinPath,
  getCdkVersion,
  getChildLogger,
  initializeLogger,
  STACK_DEPLOY_STATUS,
  STACK_DESTROY_STATUS,
};
