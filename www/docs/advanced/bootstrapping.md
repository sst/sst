---
title: Bootstrapping
description: "Bootstrapping is the process of creating resources in your AWS account before you can deploy SST apps into them."
---

import HeadlineText from "@site/src/components/HeadlineText";

<HeadlineText>

The process of creating resources in your AWS account before you can deploy SST apps into them.

</HeadlineText>

SST needs to know about the current state of your app. To do this, it stores information about the app, including [app metadata](#app-metadata) and [stack metadata](#stack-metadata), during each deployment. This information is gathered by a Lambda function that listens to CloudFormation stack deploy events. Then after collecting the information, the Lambda function uploads and stores it in an S3 bucket.

---

## Bootstrap stack

The above resources are defined in a CloudFormation stack named `SSTBootstrap`. It contains the following resources:

| Resource Name                                                       | Resource Type           | Description                                                                                                                                                              |
|---------------------------------------------------------------------|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F      | AWS::Lambda::Function   | This Lambda function automatically deletes objects within the S3 bucket when they are no longer needed.                                                                   |
| CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092         | AWS::IAM::Role          | This IAM Role is used by the Lambda function to have necessary permissions to delete objects from S3.                                                                     |
| useast124D14E4B (name varies depending on region)                   | AWS::S3::Bucket         | This S3 bucket is used to store critical information about the apps, including app metadata and stack metadata.          |
| useast1AutoDeleteObjectsCustomResourceE0E6054B (name varies depending on region) | Custom::S3AutoDeleteObjects | This Custom Resource is used to enable automatic deletion of objects within the S3 bucket.                                                                                 |
| useast1PolicyE57DC004 (name varies depending on region)             | AWS::S3::BucketPolicy   | This S3 Bucket Policy grants the necessary permissions for the relevant roles to access the bucket during SST deployments.                                                |
| MetadataHandlerBEE7179C                                             | AWS::Lambda::Function   | This Lambda function is used to handle metadata operations such as collecting and uploading metadata to the S3 bucket.                             |
| MetadataHandlerServiceRole24408145                                  | AWS::IAM::Role          | This IAM Role is used by the MetadataHandler Lambda function to have necessary permissions to perform its operations.                                                       |
| MetadataHandlerServiceRoleDefaultPolicy03477988                      | AWS::IAM::Policy        | This IAM Policy grants the MetadataHandlerServiceRole the necessary permissions to perform its operations.                                                                 |
| MetadataRule1BDDB4A9                                                | AWS::Events::Rule       | This EventBridge rule triggers the MetadataHandler Lambda function based on CloudFormation events.                                                                                |
| MetadataRuleAllowEventRuleSSTBootstrapMetadataHandler013639BCFC7CDC4B | AWS::Lambda::Permission | This permission allows the EventBridge rule to invoke the MetadataHandler Lambda function.                                                                                 |

The bootstrap stack is deployed per AWS account per region. This means that deploying multiple SST apps in the same AWS account and region will result in only one `SSTBootstrap` stack being created in that region.

You can configure the bootstrap stack, such as the stack name and tags, in [`sst.config.ts`](../configuring-sst.md#config-options).

---

## App metadata

The app metadata stores information about the mode in which the app is running, whether it is in dev mode (`sst start`) or in production mode (`sst deploy`). Apps are deployed differently in dev vs production. SST uses the app metadata to warn the user if it is switching from dev to production, or vice versa.

App metadata is stored in the S3 bucket at `appMetadata/app.{appName}/stage.{stageName}.json`.

---

## Stack metadata

The stack metadata includes information about the constructs created in each stack. The information is used by:

- [SST Console](../console.md)
- [Config](../config#updating-secrets) to look up the functions that need to be restarted when updating secret values
- [sst bind](../packages/sst.md#sst-bind) to look up the resources bound to the functions and sites

Stack metadata is stored in the S3 bucket at `appMetadata/app.{appName}/stage.{stageName}/stack.{stackName}.json`.

---

## CDK bootstrap

SST is built on top of [AWS CDK](https://aws.amazon.com/cdk/), which also has its own bootstrapping process. The CDK bootstrapping process is similar to SST. Each AWS account and region needs to be bootstrapped only once. You can read more about [CDK bootstrapping process](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html).

By default, the bootstrap stack is named `CDKToolkit`, and contains the following resources:

| Resource Name                         | Resource Type      | Description                                                                                                                     |
|---------------------------------------|--------------------|---------------------------------------------------------------------------------------------------------------------------------|
| CdkBootstrapVersion                   | AWS::SSM::Parameter| This SSM Parameter stores the bootstrap version used by the CDK to manage resources.                                             |
| CloudFormationExecutionRole           | AWS::IAM::Role     | This IAM Role is used by AWS CloudFormation to deploy stacks on your behalf.                                                     |
| ContainerAssetsRepository             | AWS::ECR::Repository| This ECR Repository is used to store Docker images that are used by your CDK application.                                         |
| DeploymentActionRole                  | AWS::IAM::Role     | This IAM Role is used to deploy AWS CDK apps. It's assumed by the CDK Toolkit during the deployment.                             |
| FilePublishingRole                    | AWS::IAM::Role     | This IAM Role is used to publish file assets to AWS S3 during the CDK app deployment.                                            |
| FilePublishingRoleDefaultPolicy       | AWS::IAM::Policy   | This IAM Policy grants the FilePublishingRole the necessary permissions to publish file assets to AWS S3.                         |
| ImagePublishingRole                   | AWS::IAM::Role     | This IAM Role is used to publish Docker images to AWS ECR during the CDK app deployment.                                         |
| ImagePublishingRoleDefaultPolicy      | AWS::IAM::Policy   | This IAM Policy grants the ImagePublishingRole the necessary permissions to publish Docker images to AWS ECR.                     |
| LookupRole                            | AWS::IAM::Role     | This IAM Role is used for performing environment lookups (reading AWS CloudFormation exports and other information).              |
| StagingBucket                         | AWS::S3::Bucket    | This S3 Bucket is used to store file and zip assets that are used by your CDK application.                                        |
| StagingBucketPolicy                   | AWS::S3::BucketPolicy | This S3 Bucket Policy grants the necessary permissions for the relevant roles to access the staging bucket during CDK deployments. |

There are two ways to customize the bootstrapping resources.

1. Configure the CDK bootstrap stack template: This involves changing various aspects such as the stack name and qualifier, in the [`sst.config.ts`](../configuring-sst.md#config-options) file.

    ```ts title="sst.config.ts"
    config(input) {
      return {
        cdk: {
          qualifier: "my-team",
          fileAssetsBucketName: "my-team-CDKToolkit",
          customPermissionsBoundary: "my-team-pb",
        }
      }
    },
    ```

    When configured, [`Stack synthesizers`](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html#bootstrapping-synthesizers) are automatically configured for all stacks in your app.

2. Modify the bootstrap template: If the first method does not offer the level of customization needed, the bootstrap template can be directly modified. This is especially useful when you need to avoid creating certain resources in the stack.

    To customize, you first need to fetch the bootstap template:
    ```bash
    cdk bootstrap --show-template > template.yaml
    ```

    You can then modify the template according to your needs, and deploy the adjusted template:
    ```bash
    cdk bootstrap --template template.yaml
    ```

    When you run `cdk bootstrap`, SST will use the stack you've manually bootstrapped.