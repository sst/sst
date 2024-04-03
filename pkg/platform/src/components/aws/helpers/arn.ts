import { VisibleError } from "../../error";

export function parseTopicArn(arn: string) {
  const topicName = arn.split(":")[5];
  if (!arn.startsWith("arn:") || !topicName)
    throw new VisibleError(
      `The provided ARN "${arn}" is not an SNS topic ARN.`,
    );
  return { topicName };
}

export function parseQueueArn(arn: string) {
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
