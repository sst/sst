import "sst"
declare module "sst" {
  export interface Resource {
    Trpc: import("@cloudflare/workers-types").Service
  }
}
export {}