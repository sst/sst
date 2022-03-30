import AWS from "aws-sdk";
const s3 = new AWS.S3();

export async function main(): Promise<string> {
  const TOTAL = 550;

  for (let i = 1; i <= TOTAL; i++) {
    await s3
      .putObject({
        Bucket: process.env.BUCKET_NAME,
        Key: `zzz-file-${i}.txt`,
        Body: `${i}`,
      })
      .promise();

    await s3
      .putObject({
        Bucket: process.env.BUCKET_NAME,
        Key: `zzz-folder/zzz-file-${i}.txt`,
        Body: `${i}`,
      })
      .promise();

    console.log(`creating ${i}/${TOTAL}..`);
  }

  return "done";
}
