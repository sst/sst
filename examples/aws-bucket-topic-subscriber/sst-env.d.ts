/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    "MyBucket": {
      "name": string
      "type": "sst.aws.Bucket"
    }
    "MyTopic": {
      "arn": string
      "type": "sst.aws.SnsTopic"
    }
  }
}
export {}
