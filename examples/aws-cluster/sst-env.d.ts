/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    "MyBucket": {
      "name": string
      "type": "sst.aws.Bucket"
    }
    "MyService": {
      "type": "sst.aws.Service"
      "url": string
    }
  }
}
export {}
