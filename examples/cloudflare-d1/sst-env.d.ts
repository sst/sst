/// <reference path="sst.types.ts" />
declare module "sst" {
  export interface Resource {
    MyDatabase: import("@cloudflare/workers-types").D1Database
  }
}
