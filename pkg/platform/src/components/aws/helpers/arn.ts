import { aws } from "../..";
import { VisibleError } from "../../error";

export function parseTopicArn(arn: string) {
  // arn:aws:sns:region:account-id:topic-name
  const topicName = arn.split(":")[5];
  if (!arn.startsWith("arn:") || !topicName)
    throw new VisibleError(
      `The provided ARN "${arn}" is not an SNS topic ARN.`,
    );
  return { topicName };
}

export function parseQueueArn(arn: string) {
  // arn:aws:sqs:region:account-id:queue-name
  const [arnStr, , , region, accountId, queueName] = arn.split(":");
  if (arnStr !== "arn" || !queueName)
    throw new VisibleError(
      `The provided ARN "${arn}" is not an SQS queue ARN.`,
    );
  return {
    queueName,
    queueUrl: `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`,
  };
}

export function parseDynamoArn(arn: string) {
  // arn:aws:dynamodb:region:account-id:table/table-name
  const tableName = arn.split("/")[1];
  if (!arn.startsWith("arn:") || !tableName)
    throw new VisibleError(
      `The provided ARN "${arn}" is not a DynamoDB table ARN.`,
    );
  return { tableName };
}

export function parseEventBus(arn: string) {
  // arn:aws:events:region:account-id:event-bus/bus-name
  const tableName = arn.split("/")[1];
  if (!arn.startsWith("arn:") || !tableName)
    throw new VisibleError(
      `The provided ARN "${arn}" is not a EventBridge event bus ARN.`,
    );
  return { tableName };
}

export function parseElasticSearch(arn: string) {
  // arn:aws:es:region:account-id:domain/domain-name
  const tableName = arn.split("/")[1];
  if (!arn.startsWith("arn:") || !tableName)
    throw new VisibleError(
      `The provided ARN "${arn}" is not a ElasticSearch domain ARN.`,
    );
  return { tableName };
}

export function parseOpenSearch(arn: string) {
  // arn:aws:opensearch:region:account-id:domain/domain-name
  const tableName = arn.split("/")[1];
  if (!arn.startsWith("arn:") || !tableName)
    throw new VisibleError(
      `The provided ARN "${arn}" is not a OpenSearch domain ARN.`,
    );
  return { tableName };
}
