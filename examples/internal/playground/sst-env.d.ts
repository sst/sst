/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    MyApp: {
      name: string
      type: "sst.aws.Function"
      url: string
    }
    MyBucket: {
      name: string
      type: "sst.aws.Bucket"
    }
  }
}
export {}
