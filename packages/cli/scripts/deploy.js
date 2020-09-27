"use strict";

const aws = require("aws-sdk");
const chalk = require("chalk");

const logger = require("./util/logger");
const { list, bootstrap, deploy } = require("./config/cdkHelpers");

module.exports = async function (argv, config, cliInfo) {
  logger.log(chalk.grey("Deploying " + (argv.stack ? argv.stack : "stacks")));

  // Wait for deploy to complete
  let stackStates;
  let isCompleted;
  do {
    // Get CFN events before update
    const prevEventCount = stackStates ? getEventCount(stackStates) : 0;

    // Update deploy status
    const cdkOptions = { ...cliInfo.cdkOptions, stackName: argv.stack };
    const response = await parallelDeploy(
      cdkOptions,
      config.region,
      stackStates
    );
    stackStates = response.stackStates;
    isCompleted = response.isCompleted;

    // Wait for 5 seconds
    if (!response.isCompleted) {
      // Get CFN events after update. If events count did not change, we need to print out a
      // message to let users know we are still checking.
      const currEventCount = getEventCount(stackStates);
      if (currEventCount === prevEventCount) {
        logger.log("Checking deploy status...");
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } while (!isCompleted);

  // Print deploy result
  stackStates.forEach(({ name, status, errorMessage, outputs, exports }) => {
    logger.log(`\nStack ${name}`);
    logger.log(`  Status: ${formatStackStatus(status)}`);
    if (errorMessage) {
      logger.log(`  Error: ${errorMessage}`);
    }

    if (Object.keys(outputs || {}).length > 0) {
      logger.log("  Outputs:");
      Object.keys(outputs).forEach((name) =>
        logger.log(`  - ${name}: ${outputs[name]}`)
      );
    }

    if (Object.keys(exports || {}).length > 0) {
      logger.log("  Exports:");
      Object.keys(exports).forEach((name) =>
        logger.log(`  - ${name}: ${exports[name]}`)
      );
    }
  });
  logger.log("");

  return stackStates.map((stackState) => ({
    name: stackState.name,
    status: stackState.status,
  }));
};

function getEventCount(stackStates) {
  return stackStates.reduce(
    (acc, stackState) => acc + (stackState.events || []).length,
    0
  );
}

function formatStackStatus(status) {
  return {
    succeeded: "deployed",
    unchanged: "no changes",
    failed: "failed",
    skipped: "not deployed",
  }[status];
}

async function parallelDeploy(cdkOptions, region, stackStates) {
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
            const { status, account, region, outputs, exports } = await deploy({
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
              logger.log(
                chalk.green(`\n ✅  ${stackState.name} (no changes)\n`)
              );
            } else if (status === "no_resources") {
              stackState.status = STACK_DEPLOY_STATUS_FAILED;
              stackState.endedAt = stackState.startedAt;
              stackState.errorMessage = `The ${stackState.name} stack contains no resources.`;
              skipPendingStacks();
              logger.log(
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
              logger.log(
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
                await bootstrap(cdkOptions);
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
                  logger.log(
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
              logger.log(
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
              logger.log(chalk.green(`\n ✅  ${stackState.name}\n`));
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
              logger.log(
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

    const outputs = [];
    const exports = [];
    (Outputs || []).forEach(({ OutputKey, OutputValue, ExportName }) => {
      OutputKey && (outputs[OutputKey] = OutputValue);
      ExportName && (exports[ExportName] = OutputValue);
    });

    return { isDeployed, outputs, exports };
  };

  const getStackEvents = async (stackState) => {
    // Note: should probably switch to use CDK's built in StackActivity class at some point

    // Stack state props will be modified:
    // - stackState.events
    // - stackState.eventsLatestErrorMessage
    // - stackState.eventsFirstEventAt

    // Get events
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
        logger.log(
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
    const { stacks } = await list(cdkOptions);
    stackStates = stacks.map(({ name, dependencies }) => ({
      name,
      status: STACK_DEPLOY_STATUS_PENDING,
      dependencies: dependencies.map((d) => d.id),
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

  const cfn = new aws.CloudFormation({ region });
  logger.debug(`Initial stack states: ${JSON.stringify(stackStates)}`);
  await updateDeployStatuses();
  logger.debug(`After update deploy statuses: ${JSON.stringify(stackStates)}`);
  await deployStacks();
  logger.debug(`After deploy stacks: ${JSON.stringify(stackStates)}`);

  const isCompleted = stackStates.every(
    (stackState) =>
      ![STACK_DEPLOY_STATUS_PENDING, STACK_DEPLOY_STATUS_DEPLOYING].includes(
        stackState.status
      )
  );

  return { stackStates, isCompleted };
}
