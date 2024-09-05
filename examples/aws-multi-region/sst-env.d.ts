/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    "MyEastFunction": {
      "name": string
      "type": "sst.aws.Function"
      "url": string
    }
    "MyWestFunction": {
      "name": string
      "type": "sst.aws.Function"
      "url": string
    }
  }
}
export {}
