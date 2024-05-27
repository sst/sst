/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    Auth: {
      publicKey: string
      type: "sst.aws.Auth"
    }
    GithubClientID: {
      type: "sst.sst.Secret"
      value: string
    }
    GithubClientSecret: {
      type: "sst.sst.Secret"
      value: string
    }
  }
}
export {}