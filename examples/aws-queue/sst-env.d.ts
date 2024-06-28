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
    MyQueue: {
      type: "sst.aws.Queue"
      url: string
    }
  }
}
export {}