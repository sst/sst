/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    "MyWeb": {
      "type": "sst.aws.Nextjs"
      "url": string
    }
    "PASSWORD": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "USERNAME": {
      "type": "sst.sst.Secret"
      "value": string
    }
  }
}
export {}
