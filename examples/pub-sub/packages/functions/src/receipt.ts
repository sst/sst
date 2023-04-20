import { SNSEvent } from "aws-lambda";

export async function main(event: SNSEvent) {
  const records: any[] = event.Records;
  console.log(`Receipt sent: "${records[0].Sns.Message}"`);

  return {};
}
