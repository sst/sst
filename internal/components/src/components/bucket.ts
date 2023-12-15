import {
  Input,
  ComponentResource,
  ComponentResourceOptions,
  output,
} from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { RandomId } from "@pulumi/random";
import { prefixName, randomDecToSuffix } from "./helpers/naming";

/**
 * Properties to create a DNS validated certificate managed by AWS Certificate Manager.
 */
export interface BucketArgs {
  /**
   * Whether the bucket should block public access
   * @default - false
   */
  blockPublicAccess?: Input<boolean>;
  nodes?: {
    bucket?: aws.s3.BucketV2Args;
  };
}

export class Bucket extends ComponentResource {
  public bucket: aws.s3.BucketV2;

  constructor(name: string, args: BucketArgs, opts?: ComponentResourceOptions) {
    super("sst:sst:Bucket", name, args, opts);

    const parent = this;

    const randomId = new RandomId(`${name}Id`, { byteLength: 6 }, { parent });

    const bucket = new aws.s3.BucketV2(
      `${name}Bucket`,
      {
        bucket: randomId.dec.apply((dec) =>
          prefixName(name.toLowerCase(), `-${randomDecToSuffix(dec)}`)
        ),
        ...args.nodes?.bucket,
      },
      {
        parent,
      }
    );

    output(args.blockPublicAccess).apply((blockPublicAccess) => {
      if (blockPublicAccess) return;

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
}
