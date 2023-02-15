---
title: IAM Credentials
description: "Learn about how SST apps use your IAM credentials."
---

SST uses your AWS credentials to run the [Live Lambda Development environment](../live-lambda-development.md) and deploy your app. Let's take a look at how to load these credentials, creating an IAM policy for SST, and the basic set of permissions that all CDK apps need.

## Loading credentials

There are a few different ways to set the credentials that SST will use. Starting with the simplest.

### Loading from a file

You can keep you AWS credentials in a file. The credentials are found at:

- `~/.aws/credentials` on Linux, Unix, and macOS;
- `C:\Users\USER_NAME\.aws\credentials` on Windows

If the credentials file does not exist on your machine:

1. Follow [this guide to create an IAM user](https://sst.dev/chapters/create-an-iam-user.html)
2. And then [use this guide to configure the credentials](https://sst.dev/chapters/configure-the-aws-cli.html)

The credentials file should look like:

```
[default]
aws_access_key_id = <YOUR_ACCESS_KEY_ID>
aws_secret_access_key = <YOUR_SECRET_ACCESS_KEY>
```

And if you have multiple credentials configured, it might look like:

```
[default]
aws_access_key_id = <DEFAULT_ACCESS_KEY_ID>
aws_secret_access_key = <DEFAULT_SECRET_ACCESS_KEY>

[staging]
aws_access_key_id = <STAGING_ACCESS_KEY_ID>
aws_secret_access_key = <STAGING_SECRET_ACCESS_KEY>

[production]
aws_access_key_id = <PRODUCTION_ACCESS_KEY_ID>
aws_secret_access_key = <PRODUCTION_SECRET_ACCESS_KEY>
```

By default, SST uses the credentials for the `[default]` profile. To use one of the other profiles, set the `AWS_PROFILE` environment variable. For example:

```bash
$ AWS_PROFILE=staging npx sst deploy
```

### Loading from environment variables

SST automatically detects AWS credentials in your environment and uses them for making requests to AWS. The environment variables that you need to set are:

- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY

This is often the most convenient way to configure credentials when deploying your SST app in a CI environment. If you are deploying through [Seed](https://seed.run/), [follow this guide to configure IAM credentials](https://seed.run/docs/iam-credentials-per-stage).

### Configuring AWS Vault

If you are using [AWS Vault](https://github.com/99designs/aws-vault) to store your IAM credentials locally, it needs to be MFA authenticated. Add the `mfa_serial` property in your AWS config file. This will cause AWS Vault to prompt for the MFA token.

### Configuring Leapp

If you are using [Leapp](https://www.leapp.cloud) to store your IAM credentials in your local environment, the IAM credentials need to be MFA authenticated.

Configure the `MFA Device ARN` when adding the credentials.

![IAM permissions Leapp setup](/img/screens/iam-permissions-leapp-setup.png)

Then Leapp will prompt for the MFA token when enabling the session.

![IAM permissions Leapp enter MFA](/img/screens/iam-permissions-leapp-enter-mfa.png)

## Creating an IAM policy

There are 4 strategies you can use to decide what IAM permissions you want to grant SST. The decision is primarily based on your use case and your team's security requirement.

### 1. Grant `AdministratorAccess` permission

Use this strategy if you are deploying to a development AWS account, and you want to try out SST quickly.

### 2. Grant full permission to selected AWS services

You can grant permissions to the AWS services you are using. This strategy prevents you from creating, updating, or removing AWS resources outside the scope of your app.

For example, to create a CRUD API endpoint that uses DynamoDB, the following permissions are required:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ManageCloudFormationStacks",
      "Effect": "Allow",
      "Action": ["cloudformation:*"],
      "Resource": "*"
    },
    {
      "Sid": "ManageApi",
      "Effect": "Allow",
      "Action": ["iam:*", "logs:*", "lambda:*", "dynamodb:*", "apigateway:*"],
      "Resource": "*"
    }
  ]
}
```

If you decide to enable custom domains for the API endpoint, a couple more permissions are required:

```json
{
  "Sid": "ManageCustomDomain",
  "Effect": "Allow",
  "Action": ["acm:*", "route53:*", "cloudfront:*"],
  "Resource": "*"
}
```

### 3. Generate using IAM Access Analyzer

The general idea of this strategy is to grant a broad permissions policy for the IAM user or role at first. Use it to deploy the SST app for some time. Then let IAM Access Analyzer analyze your CloudTrail events to identify actions and services that have been used by the IAM user or role. The analyzer will generate an IAM policy that is based on that activity. You can then replace the policy with the generated one.

You can read more about the steps required here - https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-generation.html

### 4. Use CloudFormation service role

By default, CloudFormation uses a set of temporary IAM credentials generated from your IAM credentials to deploy your stacks. So your IAM credentials need to have all the required permissions that CloudFormation in turn needs.

Instead, you can create an IAM role to explicitly specify the actions that CloudFormation can perform, which might not always be the same actions that you or other users can do.

For example, you might have full `AdministratorAccess` permission, but you can limit CloudFormation access to only a subset of privileges.

Alternatively, you might not want everyone on the team to have the permissions to create Lambda functions directly in the AWS console or via AWS CLI, but they can trigger a deployment, and let CloudFormation create Lambda functions as part of the SST app.

Use the [`--role-arn`](../packages/sst.md#global-options) option to configure the CloudFormation service role that SST will use. [Read more about this option here](../packages/sst.md#global-options).

## Additional permissions

In addition to the permissions required to deploy your SST app, you also need permissions to deploy the resources in the CDK Bootstrap stack, and the SST Debug stack.

The CDK Bootstrap stack needs to be deployed once per AWS account, per region. It will be automatically deployed the first time you run `sst deploy`. The stack contains the following AWS resources:

- AWS::IAM::Role
- AWS::IAM::Policy
- AWS::KMS::Key
- AWS::KMS::Alias
- AWS::S3::Bucket
- AWS::ECR::Repository

You can [read more about CDK Bootstrap here](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html). And you can [find the latest stack template here](https://github.com/aws/aws-cdk/blob/master/packages/aws-cdk/lib/api/bootstrap/bootstrap-template.yaml).

The SST Debug stack is deployed along your SST app when you run `sst dev`. The stack contains the following AWS resources:

- AWS::IAM::Role
- AWS::IAM::Policy
- AWS::S3::Bucket
- AWS::S3::BucketPolicy
- AWS::DynamoDB::Table
- AWS::Lambda::Function
- AWS::Lambda::Permission
- AWS::ApiGatewayV2::Api
- AWS::ApiGatewayV2::Stage
- AWS::ApiGatewayV2::Route
- AWS::ApiGatewayV2::Integration

These resources power the Live Lambda Development environment. You can [read more about it here](../live-lambda-development.md).
