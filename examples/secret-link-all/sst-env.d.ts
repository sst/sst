/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    MyBucket: {
      name: string
      type: "sst.aws.Bucket"
    }
    Secret1: {
      type: "sst.sst.Secret"
      value: string
    }
    Secret2: {
      type: "sst.sst.Secret"
      value: string
    }
  }
}
export {}