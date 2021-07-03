"use strict";

const util = require("util");
const AWS = require("aws-sdk");
const { getChildLogger } = require("@serverless-stack/core");
const logger = getChildLogger("constructs-state");

// Setup AWS logger
class AwsLogger {
  static log() {
    const string = util.format.apply(null, arguments);
    logger.debug(string);
  }
}
AWS.config.logger = AwsLogger;

const RESOURCE_SORT_ORDER = [
  "Auth",
  "Api",
  "ApiGatewayV1Api",
  "ApolloApi",
  "AppSyncApi",
  "WebSocketApi",
  "Queue",
  "Topic",
  "Cron",
  "Bucket",
  "Table",
  "KinesisStream",
  "StaticSite",
];

const RESOURCE_STATUSES = {
  NEED_UPDATE: "NEED_UPDATE",
  UPDATING: "UPDATING",
  UP_TO_DATE: "UP_TO_DATE",
};

const defaultResourcesState = {
  status: RESOURCE_STATUSES.NEED_UPDATE,
  resources: null,
};

module.exports = class ConstructsState {
  constructor({ region, stage, constructs, onConstructsUpdated }) {
    this.region = region;
    this.stage = stage;
    this.onConstructsUpdated = onConstructsUpdated;
    this.cfn = new AWS.CloudFormation({ region });

    this.constructs = [];
    this.stacksResources = {};
    this.isLoading = true;
    this.fetchResourcesError = null;

    this.initializeResources(constructs);
    this.fetchResources();
  }

  /////////////////////
  // Public Methods
  /////////////////////

  handleUpdateConstructs(constructs) {
    logger.debug("handleUpdateConstructs");

    this.constructs = [];
    this.stacksResources = {};
    this.isLoading = true;
    this.fetchResourcesError = null;

    this.initializeResources(constructs);
    this.fetchResources();
  }

  listConstructs() {
    logger.debug("listConstructs");
    if (this.fetchResourcesError) {
      return { error: JSON.stringify(this.fetchResourcesError) };
    }

    return {
      isLoading: this.isLoading,
      constructs: JSON.stringify(this.constructs),
    };
  }

  async invoke(reqBody) {
    logger.debug("invoke", reqBody);
    switch (reqBody.type) {
      case "Queue":
        return await this.invokeQueue(reqBody.queueUrl, reqBody.payload);
      case "Topic":
        return await this.invokeTopic(reqBody.topicArn, reqBody.payload);
      case "Cron":
        return await this.invokeCron(reqBody.functionName);
      case "KinesisStream":
        return await this.invokeKinesisStream(
          reqBody.streamName,
          reqBody.payload
        );
      default:
        return;
    }
  }

  /////////////////////
  // Private Methods
  /////////////////////

  initializeResources(constructs) {
    // Sort constructs
    this.constructs = constructs
      .map((c) => {
        let sortIndex = RESOURCE_SORT_ORDER.indexOf(c.type);
        sortIndex = sortIndex === -1 ? 9999 : sortIndex;
        sortIndex = sortIndex.toString().padStart(3, "0");
        return { ...c, sortIndex: `${sortIndex}|${c.name.toLowerCase()}` };
      })
      .sort((a, b) => {
        if (a.sortIndex < b.sortIndex) {
          return -1;
        }
        if (a.sortIndex > b.sortIndex) {
          return 1;
        }
        return 0;
      });

    // Initialize stacks
    constructs.forEach(({ stack }) => {
      if (this.stacksResources[stack]) {
        return;
      }
      this.stacksResources[stack] = defaultResourcesState;
    });
  }

  getPhysicalId(stack, logicalId) {
    const r = this.stacksResources[stack].resources.find(
      (p) => p.LogicalResourceId === logicalId
    );
    return r.PhysicalResourceId;
  }

  async fetchResources() {
    logger.debug("Fetching resources");
    try {
      // Fetch stack resources
      await Promise.all(
        Object.keys(this.stacksResources).map(async (stack) => {
          const resources = await this.listStackResources(stack);
          //console.log(resources);
          this.stacksResources[stack] = {
            status: RESOURCE_STATUSES.UP_TO_DATE,
            resources,
          };
        })
      );

      // Fetch API info
      await Promise.all(
        this.constructs.map(async ({ type, stack, props }) => {
          if (type === "Auth") {
            // do nothing
          } else if (
            type === "Api" ||
            type === "ApolloApi" ||
            type === "WebSocketApi"
          ) {
            const apiId =
              props.httpApiId ||
              this.getPhysicalId(stack, props.httpApiLogicalId);
            const apiInfo = await this.getHttpApi(apiId);
            props.httpApiEndpoint = apiInfo.ApiEndpoint;
          } else if (type === "ApiGatewayV1Api") {
            const apiId =
              props.restApiId ||
              this.getPhysicalId(stack, props.restApiLogicalId);
            props.restApiEndpoint = `https://${apiId}.execute-api.${this.region}.amazonaws.com/${this.stage}`;
          } else if (type === "AppSyncApi") {
            // ie. arn:aws:appsync:us-east-1:112245769880:apis/he4vocoxcjak7o3uhgyxdi272a
            const apiId =
              props.graphqlApiId ||
              this.getPhysicalId(stack, props.graphqlApiLogicalId).split(
                "/"
              )[1];
            const apiInfo = await this.getAppSyncApi(apiId);
            props.graphqlApiEndpoint = apiInfo.graphqlApi.uris.GRAPHQL;
            props.realtimeApiEndpoint = apiInfo.graphqlApi.uris.REALTIME;
          } else if (type === "StaticSite") {
            const id = this.getPhysicalId(stack, props.distributionLogicalId);
            const distributionInfo = await this.getDistribution(id);
            props.endpoint = `https://${distributionInfo.Distribution.DomainName}`;
          } else if (type === "Queue") {
            props.queueUrl =
              props.queueUrl || this.getPhysicalId(stack, props.queueLogicalId);
          } else if (type === "Topic") {
            props.topicArn =
              props.topicArn || this.getPhysicalId(stack, props.topicLogicalId);
          } else if (type === "Cron") {
            props.functionName = this.getPhysicalId(
              props.functionStack,
              props.functionLogicalId
            );
          } else if (type === "Bucket") {
            props.bucketName =
              props.bucketName ||
              this.getPhysicalId(stack, props.bucketLogicalId);
          } else if (type === "Table") {
            props.tableName =
              props.tableName ||
              this.getPhysicalId(stack, props.tableLogicalId);
          } else if (type === "KinesisStream") {
            props.streamName =
              props.streamName ||
              this.getPhysicalId(stack, props.streamLogicalId);
          }
        })
      );
    } catch (e) {
      logger.debug("Failed to fetch resources", e);
      this.fetchResourcesError = e;
    }

    this.isLoading = false;
    this.onConstructsUpdated();
  }

  async listStackResources(stack, token = undefined) {
    const ret = await callAwsSdkWithRetry(() =>
      this.cfn
        .listStackResources({
          StackName: stack,
          NextToken: token,
        })
        .promise()
    );

    // Fetch next page
    return ret.NextToken
      ? ret.StackResourceSummaries.concat(
          await this.listStackResources(stack, ret.NextToken)
        )
      : ret.StackResourceSummaries;
  }

  async getAppSyncApi(apiId) {
    const client = new AWS.AppSync({ region: this.region });
    return await callAwsSdkWithRetry(() =>
      client.getGraphqlApi({ apiId }).promise()
    );
  }

  async getDistribution(distributionId) {
    const client = new AWS.CloudFront({ region: this.region });
    return await callAwsSdkWithRetry(() =>
      client
        .getDistribution({
          Id: distributionId,
        })
        .promise()
    );
  }

  async invokeQueue(queueUrl, payload) {
    const client = new AWS.SQS({ region: this.region });
    await callAwsSdkWithRetry(() =>
      client
        .sendMessage({
          MessageBody: payload,
          QueueUrl: queueUrl,
        })
        .promise()
    );
  }

  async invokeTopic(topicArn, payload) {
    const client = new AWS.SNS({ region: this.region });
    await callAwsSdkWithRetry(() =>
      client
        .publish({
          TopicArn: topicArn,
          Message: payload,
          MessageStructure: "string",
        })
        .promise()
    );
  }

  async invokeCron(functionName) {
    const client = new AWS.Lambda({ region: this.region });
    await callAwsSdkWithRetry(() =>
      client
        .invoke({
          FunctionName: functionName,
          InvocationType: "Event",
          Payload: JSON.stringify({}),
        })
        .promise()
    );
  }

  async invokeKinesisStream(streamName, payload) {
    const client = new AWS.Kinesis({ region: this.region });
    await callAwsSdkWithRetry(() =>
      client
        .putRecord({
          Data: Buffer.from(payload),
          PartitionKey: "key",
          StreamName: streamName,
        })
        .promise()
    );
  }

  async getHttpApi(apiId) {
    const client = new AWS.ApiGatewayV2({ region: this.region });
    return await callAwsSdkWithRetry(() =>
      client
        .getApi({
          ApiId: apiId,
        })
        .promise()
    );
  }
};

async function callAwsSdkWithRetry(cb) {
  let ret;
  try {
    ret = await cb();
  } catch (e) {
    // Wait for 3 seconds and retry
    if (isRetryableException(e)) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return await callAwsSdkWithRetry(cb);
    }
    throw e;
  }
  return ret;
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
