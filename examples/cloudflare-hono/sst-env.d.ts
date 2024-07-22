/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
  }
}
// cloudflare 
declare module "sst" {
  export interface Resource {
    MyBucket: import("@cloudflare/workers-types").R2Bucket
  }
}
export {}
