import fs from "fs";
import { CustomResourceOptions, Input, dynamic } from "@pulumi/pulumi";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  S3,
} from "@aws-sdk/client-s3";
import { useClient } from "../helpers/client.js";

export interface BucketFile {
  source: string;
  key: string;
  cacheControl?: string;
  contentType: string;
  hash?: string;
}

interface Inputs {
  bucketName: string;
  files: BucketFile[];
  purge: boolean;
}

interface Outputs {
  bucketName?: string;
  files?: BucketFile[];
  purge?: boolean;
}

export interface BucketFilesInputs {
  bucketName: Input<Inputs["bucketName"]>;
  files: Input<Inputs["files"]>;
  purge: Input<Inputs["purge"]>;
}

class Provider implements dynamic.ResourceProvider {
  async create(inputs: Inputs): Promise<dynamic.CreateResult<Outputs>> {
    await this.upload(inputs.bucketName, inputs.files, []);
    return { id: "files", outs: inputs };
  }

  async update(
    id: string,
    olds: Outputs,
    news: Inputs,
  ): Promise<dynamic.UpdateResult<Outputs>> {
    const oldFiles =
      news.bucketName === olds.bucketName ? olds.files ?? [] : [];
    await this.upload(news.bucketName, news.files, oldFiles);
    if (news.purge) {
      await this.purge(news.bucketName, news.files, oldFiles);
    }
    return { outs: news };
  }

  async delete(id: string, olds: Outputs) {
    if (!olds.bucketName || !olds.files) return;

    await this.purge(olds.bucketName, [], olds.files);
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

  async purge(bucketName: string, files: BucketFile[], oldFiles: BucketFile[]) {
    const newFileKeys = Object.fromEntries(files.map((f) => [f.key, true]));
    const s3 = useClient(S3Client);
    await Promise.all(
      oldFiles
        .filter((oldFile) => !newFileKeys[oldFile.key])
        .map(async (oldFile) =>
          s3.send(
            new DeleteObjectCommand({
              Bucket: bucketName,
              Key: oldFile.key,
            }),
          ),
        ),
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
