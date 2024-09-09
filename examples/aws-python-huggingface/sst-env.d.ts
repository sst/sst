/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    "MyPythonFunction": {
      "name": string
      "type": "sst.aws.Function"
      "url": string
    }
  }
}
export {}
