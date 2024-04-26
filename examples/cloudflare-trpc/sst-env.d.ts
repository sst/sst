import "sst"
import * as cloudflare from "@cloudflare/workers-types"
declare module "sst" {
  export interface Resource {
    Trpc: import("@cloudflare/workers-types").Service
  }
}
export {}