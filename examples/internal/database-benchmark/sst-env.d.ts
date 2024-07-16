/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    Lambda: {
      name: string
      type: "sst.aws.Function"
      url: string
    }
    Planetscale: {
      database: string
      host: string
      password: string
      type: "sst.sst.Resource"
      username: string
    }
    Postgres: {
      clusterArn: string
      database: string
      secretArn: string
      type: "sst.aws.Postgres"
    }
    Worker: {
      type: "sst.cloudflare.Worker"
      url: string
    }
  }
}
