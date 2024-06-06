import "sst"
declare module "sst" {
  export interface Resource {
    Worker: {
      type: "sst.cloudflare.Worker"
      url: string
    }
  }
}
// cloudflare 
declare module "sst" {
  export interface Resource {
    MyDatabase: import("@cloudflare/workers-types").D1Database
  }
}
