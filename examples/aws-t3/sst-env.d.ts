/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    "MyPostgres": {
      "clusterArn": string
      "database": string
      "host": string
      "password": string
      "port": number
      "secretArn": string
      "type": "sst.aws.Postgres"
      "username": string
    }
    "MyWeb": {
      "type": "sst.aws.Nextjs"
      "url": string
    }
  }
}
export {}
