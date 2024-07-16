/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    MySite: {
      type: "sst.aws.StaticSite"
      url: string
    }
  }
}
export {}