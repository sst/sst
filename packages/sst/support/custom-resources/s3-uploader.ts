import fs from "fs";
import path from "path";
import { globSync } from "glob";
import AdmZip from "adm-zip";
import type { Readable } from "stream";
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { CdkCustomResourceEvent } from "aws-lambda";
import type { BaseProcessorEvent } from "./index";
import { log } from "./util.js";

interface Props {
  sources: {
    bucketName: string;
    objectKey: string;
  }[];
  destinationBucketName: string;
  filenames: {
    bucketName: string;
    objectKey: string;
  };
  fileOptions: {
    files: string | string[];
    ignore: string | string[];
    cacheControl: string;
    contentType: string;
    contentEncoding: string;
  }[];
  replaceValues: {
    files: string;
    search: string;
    replace: string;
  }[];
}

interface ProcessorEvent extends BaseProcessorEvent {
  source: Props["sources"][number];
  destinationBucketName: Props["destinationBucketName"];
  fileOptions: Props["fileOptions"];
  replaceValues: Props["replaceValues"];
}

const s3 = new S3Client({});
const lambda = new LambdaClient({});

export async function S3Uploader(cfnRequest: CdkCustomResourceEvent) {
  switch (cfnRequest.RequestType) {
    case "Create":
    case "Update":
      const props = cfnRequest.ResourceProperties as unknown as Props;
      await uploadFiles(props);
      await purgeOldFiles(props);
      break;
    case "Delete":
      break;
    default:
      throw new Error("Unsupported request type");
  }
}

async function uploadFiles(props: Props) {
  const { sources, destinationBucketName, fileOptions, replaceValues } = props;
  await Promise.all(
    sources.map((source) => {
      lambda.send(
        new InvokeCommand({
          FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
          Payload: JSON.stringify({
            processorType: "S3Uploader::BatchProcessor",
            source,
            destinationBucketName,
            fileOptions,
            replaceValues,
          } satisfies ProcessorEvent),
        })
      );
    })
  );
}

async function purgeOldFiles(props: Props) {
  if (!props.filenames) return;

  // Get all uploaded files
  const s3Object = await s3.send(
    new GetObjectCommand({
      Bucket: props.filenames.bucketName,
      Key: props.filenames.objectKey,
    })
  );
  const content = await s3Object.Body?.transformToString();
  if (!content) throw new Error("File content is empty");
  const uploadedFiles = content.split("\n");

  // Get all files in destination bucket
  const files = await s3.send(
    new ListObjectsV2Command({
      Bucket: props.destinationBucketName,
    })
  );
  const bucketFiles = files.Contents?.map((file) => file.Key);
  if (!bucketFiles) throw new Error("No files found in destination bucket");

  // Remove files that are not in the uploaded files
  for (const bucketFile of bucketFiles) {
    if (!bucketFile) continue;
    if (uploadedFiles.includes(bucketFile)) continue;

    await s3.send(
      new DeleteObjectCommand({
        Bucket: props.destinationBucketName,
        Key: bucketFile,
      })
    );
  }
}

export async function batchProcessor(props: ProcessorEvent) {
  const { source, destinationBucketName, fileOptions, replaceValues } = props;

  // Create a temporary working directory
  const contentsDir = path.join("/", "tmp", "contents");
  log({ contentsDir });
  fs.rmSync(contentsDir, { recursive: true, force: true });
  fs.mkdirSync(contentsDir, { recursive: true });

  // Download file and extract to "contents"
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: source.bucketName,
      Key: source.objectKey,
    })
  );
  const stream = response.Body as Readable;
  const zip = new AdmZip(
    await new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    })
  );
  zip.extractAllTo(contentsDir, true);

  // Replace values in files
  for (const replaceValue of replaceValues) {
    log("> pattern", replaceValue.files);
    const files = globSync(replaceValue.files, {
      cwd: contentsDir,
      nodir: true,
    });
    for (const file of files) {
      log("> > file", file);
      const content = fs
        .readFileSync(file, "utf8")
        .replaceAll(replaceValue.search, replaceValue.replace);
      fs.writeFileSync(file, content);
    }
  }

  // Upload to S3
  const filesUploaded: string[] = [];
  for (const fileOption of fileOptions) {
    const files = globSync(fileOption.files, {
      cwd: contentsDir,
      nodir: true,
      ignore: fileOption.ignore,
    }).filter((file) => !filesUploaded.includes(file));
    for (const file of files) {
      await s3.send(
        new PutObjectCommand({
          Bucket: destinationBucketName,
          Key: file,
          Body: fs.readFileSync(file),
          CacheControl: fileOption.cacheControl,
          ContentType: fileOption.contentType,
          ContentEncoding: fileOption.contentEncoding,
        })
      );
    }
    filesUploaded.push(...files);
  }
}
