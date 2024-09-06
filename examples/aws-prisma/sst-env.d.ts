/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    "MyApi": {
      "name": string
      "type": "sst.aws.Function"
      "url": string
    }
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
  }
}
export {}
