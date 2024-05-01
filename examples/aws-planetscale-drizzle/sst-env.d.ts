import "sst"
declare module "sst" {
  export interface Resource {
    Postgres: {
      clusterArn: string
      database: string
      secretArn: string
      type: "sst.aws.Postgres"
    }
  }
}
export {}