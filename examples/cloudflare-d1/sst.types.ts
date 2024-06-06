/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    Worker: {
      type: "sst.cloudflare.Worker"
      url: string
    }
  }
}
export {}