/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    Web: {
      type: "sst.aws.StaticSite"
      url: string
    }
  }
}
export {}
