/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    "MyBucket": {
      "name": string
      "type": "sst.aws.Bucket"
    }
    "MyQueue": {
      "type": "sst.aws.Queue"
      "url": string
    }
  }
}
export {}
