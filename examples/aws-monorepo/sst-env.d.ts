/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    Api: {
      name: string
      type: "sst.aws.Function"
      url: string
    }
    Astro: {
      type: "sst.aws.Astro"
      url: string
    }
    Database: {
      name: string
      type: "sst.aws.Dynamo"
    }
    MyBucket: {
      name: string
      type: "sst.aws.Bucket"
    }
    StaticSite: {
      type: "sst.aws.StaticSite"
      url: string
    }
  }
}
export {}
