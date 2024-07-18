/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    MyBucket: {
      name: string
      type: "sst.aws.Bucket"
    }
    MyWeb: {
      type: "sst.aws.Remix"
      url: string
    }
  }
}
export {}
