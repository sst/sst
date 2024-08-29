/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    "MyBucket": {
      "name": string
      "type": "sst.aws.Bucket"
    }
    "MyFunction": {
      "name": string
      "type": "sst.aws.Function"
      "url": string
    }
    "MyWeb": {
      "type": "sst.aws.StaticSite"
      "url": string
    }
  }
}
export {}
