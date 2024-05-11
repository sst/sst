/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    MyVectorDB: {
      putFunction: string
      queryFunction: string
      removeFunction: string
      type: "sst.aws.Vector"
    }
    OpenAiApiKey: {
      type: "sst.sst.Secret"
      value: string
    }
  }
}
export {}