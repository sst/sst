import { KinesisStreamHandler } from "aws-lambda";

export const all: KinesisStreamHandler = async (event) => {
  for (const record of event.Records) {
    const data = Buffer.from(record.kinesis.data, "base64").toString();
    console.log(`"All" subscriber received:`, data);
  }
};

export const filtered: KinesisStreamHandler = async (event) => {
  for (const record of event.Records) {
    const data = Buffer.from(record.kinesis.data, "base64").toString();
    console.log(`"Filtered" subscriber received:`, data);
  }
};
