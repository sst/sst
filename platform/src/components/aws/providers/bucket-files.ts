import fs from "fs";
import { CustomResourceOptions, Input, dynamic } from "@pulumi/pulumi";
import { S3Client, PutObjectCommand, S3 } from "@aws-sdk/client-s3";
import { useClient } from "../helpers/client.js";

export interface BucketFile {
  source: string;
  key: string;
  cacheControl?: string;
  contentType: string;
  hash?: string;
}

export interface BucketFilesInputs {
  bucketName: Input<string>;
  files: Input<BucketFile[]>;
}

interface Inputs {
  bucketName: string;
  files: BucketFile[];
}

class Provider implements dynamic.ResourceProvider {
  async create(inputs: Inputs): Promise<dynamic.CreateResult> {
    await this.upload(inputs.bucketName, inputs.files, []);
    return { id: "files" };
  }

  async update(
    id: string,
    olds: Inputs,
    news: Inputs,
  ): Promise<dynamic.UpdateResult> {
    await this.upload(
      news.bucketName,
      news.files,
      news.bucketName === olds.bucketName ? olds.files : [],
    );
    return {};
  }

  async upload(
    bucketName: string,
    files: BucketFile[],
    oldFiles: BucketFile[],
  ) {
    const oldFilesMap = new Map(oldFiles.map((f) => [f.key, f]));

    const s3 = useClient(S3Client);
    await Promise.all(
      files.map(async (file) => {
        const oldFile = oldFilesMap.get(file.key);
        if (
          oldFile &&
          oldFile.hash === file.hash &&
          oldFile.cacheControl === file.cacheControl &&
          oldFile.contentType === file.contentType
        ) {
          return;
        }

        await s3.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: file.key,
            Body: await fs.promises.readFile(file.source),
            CacheControl: file.cacheControl,
            ContentType: file.contentType,
          }),
        );
      }),
    );
  }
}

export class BucketFiles extends dynamic.Resource {
  constructor(
    name: string,
    args: BucketFilesInputs,
    opts?: CustomResourceOptions,
  ) {
    super(new Provider(), `${name}.sst.aws.BucketFiles`, args, opts);
  }
}
