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
  "Function",
];

module.exports = class ConstructsState {
  constructor({ app, region, stage, onConstructsUpdated }) {
    this.app = app;
    this.region = region || getDefaultRegion();
    this.stage = stage;
    this.onConstructsUpdated = onConstructsUpdated;
    this.cfn = new AWS.CloudFormation({ region: this.region });

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
        return await this.invokeFunction(
          targetInfo.Targets[0].Arn,
          targetInfo.Targets[0].Input
        );
      }
      case "KinesisStream":
        return await this.invokeKinesisStream(
          reqBody.streamName,
          reqBody.payload
        );
      case "EventBus":
        return await this.invokeEventBus(
          reqBody.eventBusName,
          reqBody.source,
          reqBody.detailType,
          reqBody.payload
        );
      case "Function":
        return await this.invokeFunction(reqBody.functionArn, reqBody.payload);
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
          const constructs = await this.fetchResources_parseStackMetadata(
            StackName
          );
          this.constructs.push(...constructs);
        })
      );

      // Fetch API info
      this.constructs = await Promise.all(
        this.constructs.map(async (construct) => {
          switch (construct.type) {
            case "Api":
              construct = await this.buildHttpApiData(construct);
              return this.buildChildData(construct, "ApiRoute", "routes");
            case "ApolloApi":
              construct = await this.buildHttpApiData(construct);
              return this.buildChildData(construct, "ApolloApiRoute", "routes");
            case "WebSocketApi":
              construct = await this.buildHttpApiData(construct);
              return this.buildChildData(
                construct,
                "WebSocketApiRoute",
                "routes"
              );
            case "ApiGatewayV1Api":
              construct = await this.buildRestApiData(construct);
              return this.buildChildData(
                construct,
                "ApiGatewayV1ApiRoute",
                "routes"
              );
            case "AppSyncApi":
              construct = await this.buildAppSyncApiData(construct);
              return this.buildChildData(
                construct,
                "AppSyncApiDataSource",
                "dataSources"
              );
            case "StaticSite":
            case "ReactStaticSite":
            case "NextjsSite":
              return await this.buildStaticSiteData(construct);
            case "Auth":
              return this.buildChildData(construct, "AuthTrigger", "triggers");
            case "Queue":
              return this.buildChildData(
                construct,
                "QueueConsumer",
                "consumers"
              );
            case "Topic":
              return this.buildChildData(
                construct,
                "TopicSubscriber",
                "subscribers"
              );
            case "Cron":
              return this.buildChildData(construct, "CronJob", "jobs");
            case "Bucket":
              return this.buildChildData(
                construct,
                "BucketNotification",
                "notifications"
              );
            case "Table":
              return this.buildChildData(
                construct,
                "TableConsumer",
                "consumers"
              );
            case "EventBus":
              construct = await this.buildEventBusData(construct);
              return this.buildChildData(
                construct,
                "EventBusTarget",
                "targets"
              );
            case "KinesisStream":
              return this.buildChildData(
                construct,
                "KinesisStreamConsumer",
                "consumers"
              );
            case "Function":
              return await this.buildFunctionData(construct);
            default:
              return null;
          }
        })
      );

      // Filter child data
      this.constructs = this.constructs.filter(
        (construct) => construct !== null
      );

      // Sort constructs
      this.constructs = this.fetchResources_sortConstructs();
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
  async fetchResources_parseStackMetadata(StackName) {
    try {
      const ret = await callAwsSdkWithRetry(() =>
        this.cfn
          .describeStackResource({
            StackName,
            LogicalResourceId: "SSTMetadata",
          })
          .promise()
      );
      const metadata = JSON.parse(ret.StackResourceDetail.Metadata);
      return metadata["sst:constructs"];
    } catch (e) {
      // If stack does not have "SSTMetadata", ignore.
      // It could be a CDK auto-created Lambda@Edge stack.
      return [];
    }
  }
  fetchResources_sortConstructs() {
    return this.constructs
      .map((c) => {
        let sortIndex = RESOURCE_SORT_ORDER.indexOf(c.type);
        sortIndex = sortIndex === -1 ? 9999 : sortIndex;
        sortIndex = sortIndex.toString().padStart(3, "0");
        sortIndex = `${sortIndex}|${(c.name || "").toLowerCase()}`;
        return { ...c, sortIndex };
      })
      .sort((a, b) => {
        if (a.sortIndex < b.sortIndex) {
          return -1;
        }
        if (a.sortIndex > b.sortIndex) {
          return 1;
        }
        return 0;
      })
      .map((c) => ({ ...c, sortIndex: undefined }));
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
  async buildRestApiData(construct) {
    const apiId = construct.restApiId;
    construct.restApiEndpoint = `https://${apiId}.execute-api.${this.region}.amazonaws.com/${this.stage}`;
    return construct;
  }
  async buildEventBusData(construct) {
    const eventBusName = construct.eventBusName;
    const rules = await this.listEventBusRules(eventBusName);
    // Find a rule with non-AWS source (ie. aws.*). Use it as the default
    // for source and detail type.
    let defaultSource = "my.event.source";
    let defaultDetailType = "My detail type";
    rules.Rules
      // ensure has EventPattern
      .filter((rule) => rule.EventPattern)
      .map((rule) => JSON.parse(rule.EventPattern))
      // ensure has EventPattern's source is not "aws.*"
      .filter(
        (pattern) =>
          pattern.source &&
          pattern.source.length > 0 &&
          !pattern.source[0].startsWith("aws.")
      )
      .some((pattern) => {
        defaultSource = pattern.source[0];
        if (pattern["detail-type"] && pattern["detail-type"].length > 0) {
          defaultDetailType = pattern["detail-type"][0];
        }
        return true;
      });
    construct.defaultSource = defaultSource;
    construct.defaultDetailType = defaultDetailType;
    return construct;
  }
  async buildAppSyncApiData(construct) {
    // ie. arn:aws:appsync:us-east-1:112245769880:apis/he4vocoxcjak7o3uhgyxdi272a
    const apiId = construct.graphqlApiId;
    const apiInfo = await this.getAppSyncApi(apiId);
    construct.graphqlApiEndpoint = apiInfo.graphqlApi.uris.GRAPHQL;
    construct.realtimeApiEndpoint = apiInfo.graphqlApi.uris.REALTIME;
    return construct;
  }
  async buildStaticSiteData(construct) {
    const id = construct.distributionId;
    const distributionInfo = await this.getDistribution(id);
    construct.endpoint = `https://${distributionInfo.Distribution.DomainName}`;
    return construct;
  }
  buildChildData(construct, childType, childrenKey) {
    construct[childrenKey] = this.constructs.filter(
      (child) => child.type === childType && child.parentAddr === construct.addr
    );
    return construct;
  }
  buildFunctionData(construct) {
    construct.functionName = construct.functionArn.split(":").pop();
    return construct;
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
  async invokeEventBus(eventBusName, source, detailType, payload) {
    const client = new AWS.EventBridge({ region: this.region });
    await callAwsSdkWithRetry(() =>
      client
        .putEvents({
          Entries: [
            {
              EventBusName: eventBusName,
              Detail: payload,
              DetailType: detailType,
              Source: source,
            },
          ],
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
  async invokeFunction(functionArn, payload) {
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

  /////////////////////
  // AWS SDK Calls
  /////////////////////

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
  async listEventBusRules(busName) {
    const client = new AWS.EventBridge({ region: this.region });
    return await callAwsSdkWithRetry(() =>
      client.listRules({ EventBusName: busName }).promise()
    );
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

function getDefaultRegion() {
  // If region is not specified in `sst.json` and in cli, then we will load
  // the default region from the local AWS config. CDK does something similar
  // internally.
  // Note that we cannot always enable "AWS_SDK_LOAD_CONFIG" for all sst commands
  // because AWS SDK fails if the `.aws/config` file is not found, which is always
  // the case inside a CI environment.
  process.env.AWS_SDK_LOAD_CONFIG = "true";

  const sts = new AWS.STS();
  return sts.config.region;
}
