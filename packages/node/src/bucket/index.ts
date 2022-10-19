import { createProxy, parseEnvironment } from "../util";

export interface BucketResources { }

export const Bucket = createProxy<BucketResources>("Bucket");
Object.assign(Bucket, parseEnvironment("Bucket", ["bucketName"]));