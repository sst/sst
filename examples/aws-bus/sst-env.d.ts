/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    Bus: {
      name: string
      type: "sst.aws.Bus"
    }
  }
}
export {}