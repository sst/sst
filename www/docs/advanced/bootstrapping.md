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

The above resources are defined in a CloudFormation stack called `SSTBootstrap`. It contains:

1. Lambda function
2. S3 bucket

The bootstrap stack is deployed per AWS account per region. This means that deploying multiple SST apps in the same AWS account and region will result in only one `SSTBootstrap` stack being created in that region.

---

## App metadata

The app metadata stores information about the mode in which the app is running, whether it is in dev mode (`sst start`) or in production mode (`sst deploy`). Apps are deployed differently in dev vs production. SST uses the app metadata to warn the user if it is switching from dev to production, or vice versa.

App metadata is stored in the S3 bucket at `appMetadata/app.{appName}/stage.{stageName}.json`.

---

## Stack metadata

The stack metadata includes information about the constructs created in each stack. The information is used by:

- [SST Console](../console.md)
- [Config](../config#updating-secrets) to look up the functions that need to be restarted when updating secret values

Stack metadata is stored in the S3 bucket at `appMetadata/app.{appName}/stage.{stageName}/stack.{stackName}.json`.

---

## CDK bootstrap

SST is built on top of [AWS CDK](https://aws.amazon.com/cdk/), which also has its own bootstrapping process. The CDK bootstrapping process is similar to SST. Each AWS account and region needs to be bootstrapped only once. You can read more about [CDK bootstrapping process](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html).
