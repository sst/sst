/* tslint:disable *//* eslint-disable */import "sst"
declare module "sst" {
  export interface Resource {
    MyTable: {
      name: string
      type: "sst.aws.Dynamo"
    }
  }
}
export {}