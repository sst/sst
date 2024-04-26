import "sst"
import * as cloudflare from "@cloudflare/workers-types"
declare module "sst" {
  export interface Resource {
    MyBucket: {
      name: string
      type: "sst.aws.Bucket"
    }
  }
}
export {}