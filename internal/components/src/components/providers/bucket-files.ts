import { fs } from "../helpers/node.js";
import path from "path";
import { CustomResourceOptions, Input, dynamic } from "@pulumi/pulumi";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { AWS } from "../helpers/aws.js";

export interface BucketFilesInputs {
  bucketName: Input<string>;
  dir: Input<string>;
  files: Input<string[]>;
}

interface Inputs {
  bucketName: string;
  dir: string;
  files: string[];
}

class Provider implements dynamic.ResourceProvider {
  async create(inputs: Inputs): Promise<dynamic.CreateResult> {
    await this.upload(inputs);
    return { id: "uploads", outs: inputs };
  }

  async update(
    id: string,
    olds: Inputs,
    news: Inputs
  ): Promise<dynamic.UpdateResult> {
    await this.upload(news);
    return { outs: news };
  }

  async upload(inputs: Inputs) {
    const s3 = AWS.useClient(S3Client);
    await Promise.all(
      inputs.files.map(async (file) =>
        s3.send(
          new PutObjectCommand({
            Bucket: inputs.bucketName,
            Key: file,
            Body: await fs.promises.readFile(path.resolve(inputs.dir, file)),
            //CacheControl: command.cacheControl,
            ContentType: getContentType(file, "UTF-8"),
          })
        )
      )
    );
  }
}

export class BucketFiles extends dynamic.Resource {
  constructor(
    name: string,
    args: BucketFilesInputs,
    opts?: CustomResourceOptions
  ) {
    super(new Provider(), `${name}.sst.BucketFiles`, args, opts);
  }
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
    [".wasm"]: { mime: "application/wasm", isText: false },
  };
  const extensionData = extensions[ext as keyof typeof extensions];
  const mime = extensionData?.mime ?? "application/octet-stream";
  const charset =
    extensionData?.isText && textEncoding !== "none"
      ? `;charset=${textEncoding}`
      : "";
  return `${mime}${charset}`;
}
