/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    Hono: {
      type: "sst.cloudflare.Worker"
      url: string
    }
  }
}
export {}