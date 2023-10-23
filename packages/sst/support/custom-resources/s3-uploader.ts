import fs from "fs/promises";
import path from "path";
import async from "async";
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
import { sdkLogger } from "./util.js";

interface Props {
  sources: {
    bucketName: string;
    objectKey: string;
  }[];
  destinationBucketName: string;
  uploadConcurrency?: number;
  filenames: {
    bucketName: string;
    objectKey: string;
  };
  textEncoding: "UTF-8" | "ISO-8859-1" | "Windows-1252" | "ASCII" | "none";
  fileOptions: {
    files: string | string[];
    ignore: string | string[];
    cacheControl: string;
    contentType: string;
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
  uploadConcurrency?: Props["uploadConcurrency"];
  textEncoding: Props["textEncoding"];
  fileOptions: Props["fileOptions"];
  replaceValues: Props["replaceValues"];
}

const s3 = new S3Client({ logger: sdkLogger });
const lambda = new LambdaClient({ logger: sdkLogger });

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
  const {
    sources,
    destinationBucketName,
    uploadConcurrency,
    textEncoding,
    fileOptions,
    replaceValues,
  } = props;
  await Promise.all(
    sources.map((source) =>
      lambda.send(
        new InvokeCommand({
          FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
          Payload: JSON.stringify({
            processorType: "S3Uploader::BatchProcessor",
            source,
            destinationBucketName,
            uploadConcurrency,
            textEncoding,
            fileOptions,
            replaceValues,
          } satisfies ProcessorEvent),
          InvocationType: "RequestResponse",
        })
      )
    )
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
  const result = await s3.send(
    new ListObjectsV2Command({
      Bucket: props.destinationBucketName,
    })
  );
  const bucketFiles = result.Contents?.map((file) => file.Key);
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
  const {
    source,
    destinationBucketName,
    uploadConcurrency,
    textEncoding,
    fileOptions,
    replaceValues,
  } = props;

  // Create a temporary working directory
  const contentsDir = path.join("/", "tmp", "contents");
  console.log({ contentsDir });
  await fs.rm(contentsDir, { recursive: true, force: true });
  await fs.mkdir(contentsDir, { recursive: true });

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
    console.log("> replace pattern", replaceValue.files);
    const files = globSync(replaceValue.files, {
      cwd: contentsDir,
      nodir: true,
      dot: true,
    });
    for (const file of files) {
      //console.log("> > file", file);
      const filePath = path.join(contentsDir, file);
      const content = await fs.readFile(filePath, "utf8");
      await fs.writeFile(
        filePath,
        content.replaceAll(replaceValue.search, replaceValue.replace)
      );
    }
  }

  // Prepare upload commands
  const commands = [];
  const filesUploaded: string[] = [];
  for (const fileOption of fileOptions.reverse()) {
    console.log("> upload options", fileOption);
    const files = globSync(fileOption.files, {
      cwd: contentsDir,
      nodir: true,
      dot: true,
      ignore: fileOption.ignore,
    }).filter((file) => !filesUploaded.includes(file));

    for (const file of files) {
      //console.log("> > file", file);
      commands.push({
        file,
        cacheControl: fileOption.cacheControl,
        contentType: fileOption.contentType,
      });
    }
    filesUploaded.push(...files);
  }

  // Upload in parallel
  console.log("> upload start");
  await async.eachLimit(commands, uploadConcurrency || 10, async (command) => {
    //console.log("> > file", command.file);
    await s3.send(
      new PutObjectCommand({
        Bucket: destinationBucketName,
        Key: command.file,
        Body: await fs.readFile(path.join(contentsDir, command.file)),
        CacheControl: command.cacheControl,
        ContentType:
          command.contentType ?? getContentType(command.file, textEncoding),
      })
    );
  });
}

function getContentType(filename: string, textEncoding: string) {
  const ext = filename.endsWith(".well-known/site-association-json")
    ? ".json"
    : path.extname(filename);

  const extensions = {
    [".txt"]: { mime: "text/plain", isText: true },
    [".htm"]: { mime: "text/html", isText: true },
    [".html"]: { mime: "text/html", isText: true },
    [".xhtml"]: { mime: "application/xhtml+xml", isText: true },
    [".css"]: { mime: "text/css", isText: true },
    [".js"]: { mime: "text/javascript", isText: true },
    [".mjs"]: { mime: "text/javascript", isText: true },
    [".apng"]: { mime: "image/apng", isText: false },
    [".avif"]: { mime: "image/avif", isText: false },
    [".gif"]: { mime: "image/gif", isText: false },
    [".jpeg"]: { mime: "image/jpeg", isText: false },
    [".jpg"]: { mime: "image/jpeg", isText: false },
    [".png"]: { mime: "image/png", isText: false },
    [".svg"]: { mime: "image/svg+xml", isText: true },
    [".bmp"]: { mime: "image/bmp", isText: false },
    [".tiff"]: { mime: "image/tiff", isText: false },
    [".webp"]: { mime: "image/webp", isText: false },
    [".ico"]: { mime: "image/vnd.microsoft.icon", isText: false },
    [".eot"]: { mime: "application/vnd.ms-fontobject", isText: false },
    [".ttf"]: { mime: "font/ttf", isText: false },
    [".otf"]: { mime: "font/otf", isText: false },
    [".woff"]: { mime: "font/woff", isText: false },
    [".woff2"]: { mime: "font/woff2", isText: false },
    [".json"]: { mime: "application/json", isText: true },
    [".jsonld"]: { mime: "application/ld+json", isText: true },
    [".xml"]: { mime: "application/xml", isText: true },
    [".pdf"]: { mime: "application/pdf", isText: false },
    [".zip"]: { mime: "application/zip", isText: false },
  };
  const extensionData = extensions[ext as keyof typeof extensions];
  const mime = extensionData?.mime ?? "application/octet-stream";
  const charset =
    extensionData?.isText && textEncoding !== "none"
      ? `;charset=${textEncoding}`
      : "";
  return `${mime}${charset}`;
}
