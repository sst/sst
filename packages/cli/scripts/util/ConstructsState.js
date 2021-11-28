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
  "EventBus",
  "KinesisStream",
  "StaticSite",
  "ReactStaticSite",
  "NextjsSite",
  "Script",
];

module.exports = class ConstructsState {
  constructor({ app, region, stage, onConstructsUpdated }) {
    this.app = app;
    this.region = region;
    this.stage = stage;
    this.onConstructsUpdated = onConstructsUpdated;
    this.cfn = new AWS.CloudFormation({ region });

    this.constructs = [];
    this.fetchResourcesError = null;

    this.initialFetchResourcesPromise = this.fetchResources();
  }

  /////////////////////
  // Public Methods
  /////////////////////

  handleUpdateConstructs() {
    logger.debug("handleUpdateConstructs");

    this.constructs = [];
    this.fetchResourcesError = null;

    this.fetchResources();
  }

  async listConstructs() {
    logger.debug("listConstructs");
    if (this.fetchResourcesError) {
      return { error: JSON.stringify(this.fetchResourcesError) };
    }

    // Wait if the initial fetch is still in progress
    if (this.initialFetchResourcesPromise) {
      await this.initialFetchResourcesPromise;
    }

    return {
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
      case "Cron": {
        const targetInfo = await this.getCronTarget(reqBody.ruleName);
        return await this.invokeCron(
          targetInfo.Targets[0].Arn,
          targetInfo.Targets[0].Input
        );
      }
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

  async fetchResources() {
    logger.debug("Fetching resources");

    this.constructs = [];

    try {
      const stacks = await this.fetchResources_getStacks();

      // Fetch constructs
      await Promise.all(
        stacks.map(async ({ StackName }) => {
          const metadata = await this.getSSTMetadata(StackName);
          //console.log(metadata);
          this.constructs.push(...metadata["sst:constructs"]);
        })
      );

      // Sort constructs
      this.constructs = this.fetchResources_sortConstructs();

      // Fetch API info
      await Promise.all(
        this.constructs.map(async (construct) => {
          const type = construct.type;
          if (
            type === "Auth" ||
            type === "Queue" ||
            type === "Topic" ||
            type === "Cron" ||
            type === "Bucket" ||
            type === "Table" ||
            type === "EventBus" ||
            type === "KinesisStream"
          ) {
            // do nothing
          } else if (
            type === "Api" ||
            type === "ApolloApi" ||
            type === "WebSocketApi"
          ) {
            construct = await this.buildHttpApiData(construct);
          } else if (type === "ApiGatewayV1Api") {
            const apiId = construct.restApiId;
            construct.restApiEndpoint = `https://${apiId}.execute-api.${this.region}.amazonaws.com/${this.stage}`;
          } else if (type === "AppSyncApi") {
            // ie. arn:aws:appsync:us-east-1:112245769880:apis/he4vocoxcjak7o3uhgyxdi272a
            const apiId = construct.graphqlApiId;
            const apiInfo = await this.getAppSyncApi(apiId);
            construct.graphqlApiEndpoint = apiInfo.graphqlApi.uris.GRAPHQL;
            construct.realtimeApiEndpoint = apiInfo.graphqlApi.uris.REALTIME;
          } else if (
            type === "StaticSite" ||
            type === "ReactStaticSite" ||
            type === "NextjsSite"
          ) {
            const id = construct.distributionId;
            const distributionInfo = await this.getDistribution(id);
            construct.endpoint = `https://${distributionInfo.Distribution.DomainName}`;
          }
        })
      );
    } catch (e) {
      logger.error("Failed to fetch resources.", e);
      this.fetchResourcesError = e;
    }

    this.onConstructsUpdated();
  }
  async fetchResources_getStacks() {
    const stacks = await this.describeStacks();
    return stacks.filter(({ Tags }) => {
      let matchApp = false;
      let matchStage = false;
      Tags.forEach(({ Key, Value }) => {
        matchApp = matchApp || (Key === "sst:app" && Value === this.app);
        matchStage = matchApp || (Key === "sst:stage" && Value === this.stage);
      });
      return matchApp && matchStage;
    });
  }
  fetchResources_sortConstructs() {
    return this.constructs
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
  }

  async buildHttpApiData(construct) {
    const apiId = construct.httpApiId;
    const [apiInfo, stages] = await Promise.all([
      this.getHttpApi(apiId),
      this.getHttpApiStages(apiId),
    ]);

    // Use the stage name from the first stage
    const stageName = stages.Items.length > 0 ? stages.Items[0].StageName : "";
    construct.httpApiEndpoint =
      stageName === "$default" || stageName === ""
        ? apiInfo.ApiEndpoint
        : `${apiInfo.ApiEndpoint}/${stageName}`;

    return construct;
  }

  async describeStacks(token = undefined) {
    const ret = await callAwsSdkWithRetry(() =>
      this.cfn
        .describeStacks({
          NextToken: token,
        })
        .promise()
    );

    // Fetch next page
    return ret.NextToken
      ? ret.Stacks.concat(await this.describeStacks(ret.NextToken))
      : ret.Stacks;
  }
  async getSSTMetadata(StackName) {
    const ret = await callAwsSdkWithRetry(() =>
      this.cfn
        .describeStackResource({
          StackName,
          LogicalResourceId: "SSTMetadata",
        })
        .promise()
    );
    return JSON.parse(ret.StackResourceDetail.Metadata);
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

  async getHttpApiStages(apiId) {
    const client = new AWS.ApiGatewayV2({ region: this.region });
    return await callAwsSdkWithRetry(() =>
      client
        .getStages({
          ApiId: apiId,
        })
        .promise()
    );
  }

  async getCronTarget(ruleName) {
    const client = new AWS.EventBridge({ region: this.region });
    return await callAwsSdkWithRetry(() =>
      client
        .listTargetsByRule({
          Rule: ruleName,
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

  async invokeCron(functionArn, payload) {
    const client = new AWS.Lambda({ region: this.region });
    await callAwsSdkWithRetry(() =>
      client
        .invoke({
          FunctionName: functionArn,
          InvocationType: "Event",
          Payload: payload,
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
