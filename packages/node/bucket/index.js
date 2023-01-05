import { createProxy, parseEnvironment } from "../util/index.js";
export const Bucket = createProxy("Bucket");
Object.assign(Bucket, parseEnvironment("Bucket", ["bucketName"]));
