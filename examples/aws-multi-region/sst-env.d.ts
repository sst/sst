/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    "East": {
      "name": string
      "type": "sst.aws.Function"
      "url": string
    }
    "West": {
      "name": string
      "type": "sst.aws.Function"
      "url": string
    }
  }
}
export {}
