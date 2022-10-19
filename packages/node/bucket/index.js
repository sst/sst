import { createProxy, parseEnvironment } from "../util";
export const Bucket = createProxy("Bucket");
Object.assign(Bucket, parseEnvironment("Bucket", ["bucketName"]));
