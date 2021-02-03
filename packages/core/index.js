"use strict";

const cdk = require("sst-cdk");
const aws = require("aws-sdk");
const chalk = require("chalk");
const spawn = require("cross-spawn");

const { logger, getChildLogger, initializeLogger } = require("./logger");

const packageJson = require("./package.json");

function getCdkVersion() {
  const sstCdkVersion = packageJson.dependencies["sst-cdk"];
  return sstCdkVersion.match(/^(\d+\.\d+.\d+)/)[1];
}

async function synth(cdkOptions) {
  //return await cdk.synth(cdkOptions);
  console.log(cdkOptions);
  const response = spawn.sync(
    "cdk",
    [
      "synth",
      "--app",
      cdkOptions.app,
      "--output",
      cdkOptions.output,
      ...(cdkOptions.noColor ? ["--no-color"] : []),
      ...(cdkOptions.verbose === 0 ? [] : ["--verbose"]),
    ],
    { stdio: "inherit" }
  );

  return response;
}

async function bootstrap(cdkOptions) {
  return await cdk.bootstrap(cdkOptions);
}

async function deploy(cdkOptions) {
  return await cdk.deploy(cdkOptions);
}

async function destroy(cdkOptions) {
  return await cdk.destroy(cdkOptions);
}

async function parallelDeploy(cdkOptions, stackStates) {
  const STACK_DEPLOY_STATUS_PENDING = "pending";
  const STACK_DEPLOY_STATUS_DEPLOYING = "deploying";
  const STACK_DEPLOY_STATUS_SUCCEEDED = "succeeded";
  const STACK_DEPLOY_STATUS_UNCHANGED = "unchanged";
  const STACK_DEPLOY_STATUS_FAILED = "failed";
  const STACK_DEPLOY_STATUS_SKIPPED = "skipped";

  const deployStacks = async () => {
    let hasSucceededStack = false;

    const statusesByStackName = {};
    stackStates.forEach(({ name, status }) => {
      statusesByStackName[name] = status;
    });

    await Promise.all(
      stackStates
        .filter(
          (stackState) => stackState.status === STACK_DEPLOY_STATUS_PENDING
        )
        .filter((stackState) =>
          stackState.dependencies.every(
            (dep) =>
              ![
                STACK_DEPLOY_STATUS_PENDING,
                STACK_DEPLOY_STATUS_DEPLOYING,
              ].includes(statusesByStackName[dep])
          )
        )
        .map(async (stackState) => {
          try {
            logger.debug(`Deploying stack ${stackState.name}`);
            const {
              status,
              account,
              region,
              outputs,
              exports,
            } = await cdk.deployAsync({
              ...cdkOptions,
              stackName: stackState.name,
            });
            stackState.startedAt = Date.now();
            stackState.account = account;
            stackState.region = region;
            stackState.outputs = outputs;
            stackState.exports = exports;
            logger.debug(
              `Deploying stack ${stackState.name} status: ${status}`
            );

            if (status === "unchanged") {
              stackState.status = STACK_DEPLOY_STATUS_UNCHANGED;
              stackState.endedAt = stackState.startedAt;
              hasSucceededStack = true;
              logger.info(
                chalk.green(`\n ✅  ${stackState.name} (no changes)\n`)
              );
            } else if (status === "no_resources") {
              stackState.status = STACK_DEPLOY_STATUS_FAILED;
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
            } else if (status === "deploying") {
              stackState.status = STACK_DEPLOY_STATUS_DEPLOYING;
            } else {
              stackState.status = STACK_DEPLOY_STATUS_FAILED;
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
            } else if (isBootstrapException(deployEx)) {
              try {
                logger.debug(`Bootstraping stack ${stackState.name}`);
                await cdk.bootstrap(cdkOptions);
                logger.debug(`Bootstraped stack ${stackState.name}`);
              } catch (bootstrapEx) {
                logger.debug(
                  `Bootstrap stack ${stackState.name} exception ${bootstrapEx}`
                );
                if (isRetryableException(bootstrapEx)) {
                  // retry
                } else {
                  stackState.status = STACK_DEPLOY_STATUS_FAILED;
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
              stackState.status = STACK_DEPLOY_STATUS_FAILED;
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
          (stackState) => stackState.status === STACK_DEPLOY_STATUS_DEPLOYING
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
              stackState.status = STACK_DEPLOY_STATUS_SUCCEEDED;
              stackState.endedAt = Date.now();
              logger.info(chalk.green(`\n ✅  ${stackState.name}\n`));
            }
          } catch (statusEx) {
            logger.debug(statusEx);
            if (isRetryableException(statusEx)) {
              // retry
            } else {
              stackState.status = STACK_DEPLOY_STATUS_FAILED;
              stackState.endedAt = Date.now();
              stackState.errorMessage =
                stackState.eventsLatestErrorMessage || statusEx.message;
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
      .filter((stackState) => stackState.status === STACK_DEPLOY_STATUS_PENDING)
      .forEach((stackState) => {
        stackState.status = STACK_DEPLOY_STATUS_SKIPPED;
      });
  };

  const getDeployStatus = async (stackState) => {
    const stackName = stackState.name;
    const cfn = new aws.CloudFormation({ region: stackState.region });
    const ret = await cfn.describeStacks({ StackName: stackName }).promise();

    // Handle no stack found
    if (ret.Stacks.length === 0) {
      throw new Error(
        `The stack named ${stackName} failed to deploy, it is removed while deploying.`
      );
    }

    const { StackStatus, Outputs } = ret.Stacks[0];
    let isDeployed;

    // Case: in progress
    if (StackStatus.endsWith("_IN_PROGRESS")) {
      isDeployed = false;
    }
    // Case: stack creation failed
    else if (
      StackStatus === "ROLLBACK_COMPLETE" ||
      StackStatus === "ROLLBACK_FAILED"
    ) {
      throw new Error(
        `The stack named ${stackName} failed creation, it may need to be manually deleted from the AWS console: ${StackStatus}`
      );
    }
    // Case: stack deploy failed
    else if (
      StackStatus !== "CREATE_COMPLETE" &&
      StackStatus !== "UPDATE_COMPLETE"
    ) {
      throw new Error(
        `The stack named ${stackName} failed to deploy: ${StackStatus}`
      );
    }
    // Case: deploy suceeded
    else {
      isDeployed = true;
    }

    const outputs = {};
    const exports = {};
    if (isDeployed) {
      (Outputs || []).forEach(({ OutputKey, OutputValue, ExportName }) => {
        OutputKey && (outputs[OutputKey] = OutputValue);
        ExportName && (exports[ExportName] = OutputValue);
      });
    }

    return { isDeployed, outputs, exports };
  };

  const getStackEvents = async (stackState) => {
    // Note: should probably switch to use CDK's built in StackActivity class at some point

    // Stack state props will be modified:
    // - stackState.events
    // - stackState.eventsLatestErrorMessage
    // - stackState.eventsFirstEventAt

    // Get events
    const cfn = new aws.CloudFormation({ region: stackState.region });
    const ret = await cfn
      .describeStackEvents({ StackName: stackState.name })
      .promise();
    const stackEvents = ret.StackEvents || [];

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

    // Loop through stack events
    const events = stackState.events || [];
    stackEvents.reverse().forEach((event) => {
      const eventInRange =
        stackState.eventsFirstEventAt &&
        stackState.eventsFirstEventAt <= event.Timestamp;
      const eventNotLogged = events.every(
        (loggedEvent) => loggedEvent.eventId !== event.EventId
      );
      let eventStatus = event.ResourceStatus;
      if (eventInRange && eventNotLogged) {
        let isFirstError = false;
        // Keep track of first failed event
        if (
          eventStatus &&
          (eventStatus.endsWith("FAILED") ||
            eventStatus.endsWith("ROLLBACK_IN_PROGRESS")) &&
          !stackState.eventsLatestErrorMessage
        ) {
          stackState.eventsLatestErrorMessage = event.ResourceStatusReason;
          isFirstError = true;
        }
        // Print new events
        const statusColor = colorFromStatusResult(event.ResourceStatus);
        logger.info(
          `${stackState.name}` +
            ` | ${statusColor(event.ResourceStatus || "")}` +
            ` | ${event.ResourceType}` +
            ` | ${statusColor(chalk.bold(event.LogicalResourceId || ""))}` +
            ` ${
              isFirstError ? statusColor(event.ResourceStatusReason || "") : ""
            }`
        );
        // Prepare for next monitoring action
        events.push({
          eventId: event.EventId,
          timestamp: event.Timestamp,
          resourceType: event.ResourceType,
          resourceStatus: event.ResourceStatus,
          resourceStatusReason: event.ResourceStatusReason,
          logicalResourceId: event.LogicalResourceId,
        });
      }
    });
    stackState.events = events;
  };

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

  function isBootstrapException(e) {
    return (
      e.message &&
      e.message.startsWith(
        "This stack uses assets, so the toolkit stack must be deployed to the environment"
      )
    );
  }

  const colorFromStatusResult = (status) => {
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
  };

  // Case: initial call
  if (!stackStates) {
    let stacks;
    if (cdkOptions.stackName) {
      stacks = [{ name: cdkOptions.stackName, dependencies: [] }];
    } else {
      const listRet = await cdk.list(cdkOptions);
      stacks = listRet.stacks;
    }
    stackStates = stacks.map(({ name, dependencies }) => ({
      name,
      status: STACK_DEPLOY_STATUS_PENDING,
      dependencies,
      account: undefined,
      region: undefined,
      startedAt: undefined,
      endedAt: undefined,
      events: [],
      eventsLatestErrorMessage: undefined,
      eventsFirstEventAt: undefined,
      errorMessage: undefined,
      outputs: undefined,
    }));
  }

  logger.trace(`Initial stack states: ${JSON.stringify(stackStates)}`);
  await updateDeployStatuses();
  logger.trace(`After update deploy statuses: ${JSON.stringify(stackStates)}`);
  await deployStacks();
  logger.trace(`After deploy stacks: ${JSON.stringify(stackStates)}`);

  const isCompleted = stackStates.every(
    (stackState) =>
      ![STACK_DEPLOY_STATUS_PENDING, STACK_DEPLOY_STATUS_DEPLOYING].includes(
        stackState.status
      )
  );

  return { stackStates, isCompleted };
}

async function parallelDestroy(cdkOptions, stackStates) {
  const STACK_DESTROY_STATUS_PENDING = "pending";
  const STACK_DESTROY_STATUS_REMOVING = "removing";
  const STACK_DESTROY_STATUS_SUCCEEDED = "succeeded";
  const STACK_DESTROY_STATUS_FAILED = "failed";
  const STACK_DESTROY_STATUS_SKIPPED = "skipped";

  const destroyStacks = async () => {
    let hasSucceededStack = false;

    const statusesByStackName = {};
    stackStates.forEach(({ name, status }) => {
      statusesByStackName[name] = status;
    });

    await Promise.all(
      stackStates
        .filter(
          (stackState) => stackState.status === STACK_DESTROY_STATUS_PENDING
        )
        .filter((stackState) =>
          stackState.dependencies.every(
            (dep) => statusesByStackName[dep] === STACK_DESTROY_STATUS_SUCCEEDED
          )
        )
        .map(async (stackState) => {
          try {
            logger.debug(`Destroying stack ${stackState.name}`);
            const { status, region } = await cdk.destroyAsync({
              ...cdkOptions,
              stackName: stackState.name,
            });
            stackState.region = region;
            logger.debug(
              `Destroying stack ${stackState.name} status: ${status}`
            );

            if (status === "destroyed") {
              stackState.status = STACK_DESTROY_STATUS_SUCCEEDED;
              hasSucceededStack = true;
              logger.info(chalk.green(`\n ✅  ${stackState.name}\n`));
            } else if (status === "destroying") {
              stackState.status = STACK_DESTROY_STATUS_REMOVING;
            } else {
              stackState.status = STACK_DESTROY_STATUS_FAILED;
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
              stackState.status = STACK_DESTROY_STATUS_FAILED;
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
          (stackState) => stackState.status === STACK_DESTROY_STATUS_REMOVING
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
              stackState.status = STACK_DESTROY_STATUS_SUCCEEDED;
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
              stackState.status = STACK_DESTROY_STATUS_SUCCEEDED;
              logger.info(chalk.green(`\n ✅  ${stackState.name}\n`));
            }
          } catch (statusEx) {
            logger.debug(statusEx);
            if (isRetryableException(statusEx)) {
              // retry
            } else if (isStackNotExistException(statusEx)) {
              stackState.status = STACK_DESTROY_STATUS_SUCCEEDED;
              logger.info(chalk.green(`\n ✅  ${stackState.name}\n`));
            } else {
              stackState.status = STACK_DESTROY_STATUS_FAILED;
              stackState.errorMessage =
                stackState.eventsLatestErrorMessage || statusEx.message;
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
        (stackState) => stackState.status === STACK_DESTROY_STATUS_PENDING
      )
      .forEach((stackState) => {
        stackState.status = STACK_DESTROY_STATUS_SKIPPED;
      });
  };

  const getDestroyStatus = async (stackState) => {
    let isDestroyed;
    const stackName = stackState.name;
    const cfn = new aws.CloudFormation({ region: stackState.region });
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
        throw new Error(
          `The stack named ${stackName} failed to destroy: ${StackStatus}`
        );
      }
    }

    return { isDestroyed };
  };

  const getStackEvents = async (stackState) => {
    // Note: should probably switch to use CDK's built in StackActivity class at some point

    // Stack state props will be modified:
    // - stackState.events
    // - stackState.eventsLatestErrorMessage
    // - stackState.eventsFirstEventAt

    // Get events
    const cfn = new aws.CloudFormation({ region: stackState.region });
    const ret = await cfn
      .describeStackEvents({ StackName: stackState.name })
      .promise();
    const stackEvents = ret.StackEvents || [];

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

    // Loop through stack events
    const events = stackState.events || [];
    stackEvents.reverse().forEach((event) => {
      const eventInRange =
        stackState.eventsFirstEventAt &&
        stackState.eventsFirstEventAt <= event.Timestamp;
      const eventNotLogged = events.every(
        (loggedEvent) => loggedEvent.eventId !== event.EventId
      );
      let eventStatus = event.ResourceStatus;
      if (eventInRange && eventNotLogged) {
        let isFirstError = false;
        // Keep track of first failed event
        if (
          eventStatus &&
          (eventStatus.endsWith("FAILED") ||
            eventStatus.endsWith("ROLLBACK_IN_PROGRESS")) &&
          !stackState.eventsLatestErrorMessage
        ) {
          stackState.eventsLatestErrorMessage = event.ResourceStatusReason;
          isFirstError = true;
        }
        // Print new events
        const statusColor = colorFromStatusResult(event.ResourceStatus);
        logger.info(
          `${stackState.name}` +
            ` | ${statusColor(event.ResourceStatus || "")}` +
            ` | ${event.ResourceType}` +
            ` | ${statusColor(chalk.bold(event.LogicalResourceId || ""))}` +
            ` ${
              isFirstError ? statusColor(event.ResourceStatusReason || "") : ""
            }`
        );
        // Prepare for next monitoring action
        events.push({
          eventId: event.EventId,
          timestamp: event.Timestamp,
          resourceType: event.ResourceType,
          resourceStatus: event.ResourceStatus,
          resourceStatusReason: event.ResourceStatusReason,
          logicalResourceId: event.LogicalResourceId,
        });
      }
    });
    stackState.events = events;
  };

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

  const colorFromStatusResult = (status) => {
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
  };

  // Case: initial call
  if (!stackStates) {
    let stacks;
    if (cdkOptions.stackName) {
      stacks = [{ name: cdkOptions.stackName, dependencies: [] }];
    } else {
      const listRet = await cdk.list(cdkOptions);
      stacks = listRet.stacks;
    }

    // Generate reverse dependency map
    const reverseDependencyMapping = {};
    stacks.forEach(({ name, dependencies }) =>
      dependencies.forEach((dep) => {
        reverseDependencyMapping[dep] = reverseDependencyMapping[dep] || [];
        reverseDependencyMapping[dep].push(name);
      })
    );

    stackStates = stacks.map(({ name }) => ({
      name,
      status: STACK_DESTROY_STATUS_PENDING,
      dependencies: reverseDependencyMapping[name] || [],
      events: [],
      eventsLatestErrorMessage: undefined,
      eventsFirstEventAt: undefined,
      errorMessage: undefined,
    }));
  }

  logger.trace(`Initial stack states: ${JSON.stringify(stackStates)}`);
  await updateDestroyStatuses();
  logger.trace(`After update destroy statuses: ${JSON.stringify(stackStates)}`);
  await destroyStacks();
  logger.trace(`After destroy stacks: ${JSON.stringify(stackStates)}`);

  const isCompleted = stackStates.every(
    (stackState) =>
      ![STACK_DESTROY_STATUS_PENDING, STACK_DESTROY_STATUS_REMOVING].includes(
        stackState.status
      )
  );

  return { stackStates, isCompleted };
}

module.exports = {
  synth,
  deploy,
  logger,
  destroy,
  bootstrap,
  getCdkVersion,
  getChildLogger,
  parallelDeploy,
  parallelDestroy,
  initializeLogger,
};
