/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    Api: {
      name: string
      type: "sst.aws.Function"
    }
    Database: {
      name: string
      type: "sst.aws.Dynamo"
    }
    StaticSite: {
      type: "sst.aws.StaticSite"
      url: string
    }
  }
}
export {}