/* tslint:disable *//* eslint-disable */import "sst"
declare module "sst" {
  export interface Resource {
    MyApi: {
      managementEndpoint: string
      type: "sst.aws.ApiGatewayWebSocket"
      url: string
    }
  }
}
export {}