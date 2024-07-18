/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    ExistingResources: {
      bucketName: string
      queueName: string
      type: "sst.sst.Linkable"
    }
    Function: {
      name: string
      type: "sst.aws.Function"
      url: string
    }
    Topic: {
      arn: string
      name: string
      type: "aws.sns/topic.Topic"
    }
  }
}
export {}
