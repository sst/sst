import sharp from "sharp";
import stream from "stream";

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const width = 100;
const prefix = `${width}w`;

const S3 = new S3Client({});

// Read stream for downloading from S3
async function readStreamFromS3({
  Bucket,
  Key,
}: {
  Bucket: string;
  Key: string;
}) {
  const commandPullObject = new GetObjectCommand({
    Bucket,
    Key,
  });
  const response = await S3.send(commandPullObject);

  return response;
}

// Write stream for uploading to S3
function writeStreamToS3({ Bucket, Key }: { Bucket: string; Key: string }) {
  const pass = new stream.PassThrough();
  const upload = new Upload({
    client: S3,
    params: {
      Bucket,
      Key,
      Body: pass,
    },
  });

  return {
    writeStream: pass,
    upload,
  };
}

// Sharp resize stream
function streamToSharp(width: number) {
  return sharp().resize(width);
}

import { S3Handler } from "aws-lambda";

export const main: S3Handler = async (event) => {
  const s3Record = event.Records[0].s3;

  // Grab the filename and bucket name
  const Key = s3Record.object.key;
  const Bucket = s3Record.bucket.name;

  // Check if the file has already been resized
  if (Key.startsWith(prefix)) {
    return;
  }

  // Create the new filename with the dimensions
  const newKey = `${prefix}-${Key}`;

  // Stream to read the file from the bucket
  const readStream = await readStreamFromS3({ Key, Bucket });
  // Stream to resize the image
  const resizeStream = streamToSharp(width);
  // Stream to upload to the bucket
  const { writeStream, upload } = writeStreamToS3({
    Bucket,
    Key: newKey,
  });

  // Trigger the streams
  (readStream?.Body as NodeJS.ReadableStream)
    .pipe(resizeStream)
    .pipe(writeStream);

  try {
    // Wait for the file to upload
    await upload.done();
  } catch (err) {
    console.log(err);
  }
};
