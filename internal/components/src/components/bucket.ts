import {
  Input,
  ComponentResourceOptions,
  output,
  Output,
  all,
  interpolate,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { RandomId } from "@pulumi/random";
import { prefixName, hashNumberToString } from "./helpers/naming";
import { Component } from "./component";
import { AWSLinkable, Link, Linkable } from "./link";
import { FunctionPermissionArgs } from ".";

/**
 * Properties to create a DNS validated certificate managed by AWS Certificate Manager.
 */
export interface BucketArgs {
  /**
   * Whether the bucket should block public access
   * @default - true
   */
  blockPublicAccess?: Input<boolean>;
  nodes?: {
    bucket?: aws.s3.BucketV2Args;
  };
}

export class Bucket extends Component implements Linkable, AWSLinkable {
  public bucket: aws.s3.BucketV2;

  constructor(
    name: string,
    args?: BucketArgs,
    opts?: ComponentResourceOptions
  ) {
    super("sst:sst:Bucket", name, args, opts);

    const parent = this;
    const blockPublicAccess = normalizeBlockPublicAccess();

    const randomId = new RandomId(`${name}Id`, { byteLength: 6 }, { parent });

    const bucket = new aws.s3.BucketV2(
      `${name}Bucket`,
      {
        bucket: randomId.dec.apply((dec) =>
          prefixName(
            name.toLowerCase(),
            `-${hashNumberToString(parseInt(dec), 8)}`
          )
        ),
        forceDestroy: true,
        ...args?.nodes?.bucket,
      },
      {
        parent,
      }
    );

    output(blockPublicAccess).apply((blockPublicAccess) => {
      if (!blockPublicAccess) return;

      new aws.s3.BucketPublicAccessBlock(
        `${name}PublicAccessBlock`,
        {
          bucket: bucket.bucket,
          blockPublicAcls: true,
          blockPublicPolicy: true,
          ignorePublicAcls: true,
          restrictPublicBuckets: true,
        },
        { parent }
      );
    });

    this.bucket = bucket;

    function normalizeBlockPublicAccess() {
      return output(args?.blockPublicAccess).apply((v) => v ?? true);
    }
  }

  public get name() {
    return this.bucket.bucket;
  }

  public get arn() {
    return this.bucket.arn;
  }

  public get nodes() {
    return {
      bucket: this.bucket,
    };
  }

  public getSSTLink(): Link {
    return {
      type: `{ bucketName: string }`,
      value: {
        bucketName: this.name,
      },
    };
  }

  public getSSTAWSPermissions(): FunctionPermissionArgs {
    return {
      actions: ["s3:*"],
      resources: [this.bucket.arn, interpolate`${this.bucket.arn}/*`],
    };
  }
}
