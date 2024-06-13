/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    MyApi: {
      name: string
      type: "sst.aws.Function"
      url: string
    }
    MyBucket: {
      name: string
      type: "sst.aws.Bucket"
    }
    MyRouter: {
      type: "sst.aws.Router"
      url: string
    }
  }
}
export {}