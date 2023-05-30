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

If you are using temporary credentials, also set:

- AWS_SESSION_TOKEN

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

There are 3 strategies you can use to decide what IAM permissions you want to grant SST. The decision is primarily based on your use case and your team's security requirement.

### 1. Grant `AdministratorAccess` permission

This strategy is most suited to teams where each member has a personal AWS sandbox account. This arrangement provides developers with a secure environment in which they can experiment and innovate, while simultaneously protecting production environments from unintended disruptions.

### 2. Generate using IAM Access Analyzer

This strategy involves initially granting a broad permissions policy. After deploying the SST app and allowing it to run for a period of time, IAM Access Analyzer can be used to scrutinize your CloudTrail events and identify the actions and services utilised by the IAM user or role. The analyzer will then generate an IAM policy based on this activity, which can replace the original broad policy.

Detailed steps for this process can be found at the following link - https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-generation.html

### 3. Least privilege policies

A comprehensive list of IAM permissions can be found in the [IAM permissions](#iam-permissions) section below. Please note that this list is subject to changes over time.

## IAM permissions

IAM permissions can be classified into four main types:

### 1. Permissions required to bootstrap AWS CDK

AWS CDK needs to deploy the bootstrap stack once for each AWS account, per region. This happens automatically the first time you execute `sst deploy` or `sst dev`. You can [read more about CDK bootstrap here](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html).

Below are the permissions required:

- Permissions to deploy the CDK bootstrap CloudFormation stack.
  ```json
  {
      "Effect": "Allow",
      "Action": [
          "cloudformation:CreateChangeSet",
          "cloudformation:DeleteChangeSet",
          "cloudformation:DeleteStack",
          "cloudformation:DescribeChangeSet",
          "cloudformation:DescribeStacks",
          "cloudformation:DescribeStackEvents",
          "cloudformation:ExecuteChangeSet",
          "cloudformation:GetTemplate"
      ],
      "Resource": [
          "arn:aws:cloudformation:us-east-1:112245769880:stack/CDKToolkit/*"
      ]
  }
  ```

- Permissions to create the CDK bootstrap roles. CDK uses these role to deploy your application to AWS.
  ```json
  {
      "Effect": "Allow",
      "Action": [
          "iam:AttachRolePolicy",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:DeleteRolePolicy",
          "iam:DetachRolePolicy",
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:PutRolePolicy",
          "iam:TagRole"
      ],
      "Resource": [
          "arn:aws:iam::112245769880:role/cdk-hnb659fds-cfn-exec-role-*",
          "arn:aws:iam::112245769880:role/cdk-hnb659fds-file-publishing-role-*",
          "arn:aws:iam::112245769880:role/cdk-hnb659fds-image-publishing-role-*",
          "arn:aws:iam::112245769880:role/cdk-hnb659fds-lookup-role-*",
          "arn:aws:iam::112245769880:role/cdk-hnb659fds-deploy-role-*"
      ]
  }
  ```

- Permissions to create the CDK bootstrap bucket. CDK uses this bucket to stage S3 assets in your application, such as Lambda function bundles and static assets in your frontend applications. 
  ```json
  {
      "Effect": "Allow",
      "Action": [
          "s3:CreateBucket",
          "s3:DeleteBucketPolicy",
          "s3:GetEncryptionConfiguration",
          "s3:GetBucketPolicy",
          "s3:PutBucketPolicy",
          "s3:PutBucketVersioning",
          "s3:PutEncryptionConfiguration",
          "s3:PutLifecycleConfiguration",
          "s3:PutBucketPublicAccessBlock"
      ],
      "Resource": [
          "arn:aws:s3:::cdk-hnb659fds-assets-*"
      ]
  }
  ```

- Permissions to create CDK bootstrap ECR repository. CDK uses this repository to stage Docker images in your application.
  ```json
  {
      "Effect": "Allow",
      "Action": [
          "ecr:CreateRepository",
          "ecr:DeleteRepository",
          "ecr:DescribeRepositories",
          "ecr:PutLifecyclePolicy",
          "ecr:SetRepositoryPolicy"
      ],
      "Resource": [
          "arn:aws:ecr:us-east-1:112245769880:repository/cdk-hnb659fds-container-assets-*"
      ]
  }
  ```

- Permissions to create CDK bootstrap version SSM parameter. The parameter stores the version of the deployed CDK bootstrap stack.
  ```json
  {
      "Effect": "Allow",
      "Action": [
          "ssm:DeleteParameter",
          "ssm:GetParameters",
          "ssm:PutParameter"
      ],
      "Resource": [
          "arn:aws:ssm:us-east-1:112245769880:parameter/cdk-bootstrap/hnb659fds/version"
      ]
  }
  ```

### 2. Permissions required by AWS CDK to deploy your application

AWS CDK creates a **CloudFormation service IAM role** as part of its bootstrap stack. When SST calls CDK to deploy your application, CloudFormation assumes this role for deployment.

By default, CloudFormation uses a set of temporary IAM credentials generated from your IAM credentials to deploy your stacks. However, CDK creates an IAM role to explicitly specify the actions that CloudFormation can perform. This is useful when not everyone on the team has the permissions to create Lambda functions directly in the AWS console or via AWS CLI, but they can trigger a deployment, allowing CloudFormation to create Lambda functions as part of the SST app.

You can find the permissions allowed for the IAM role in the [latest CDK bootstrap stack template here](https://github.com/aws/aws-cdk/blob/master/packages/aws-cdk/lib/api/bootstrap/bootstrap-template.yaml).

You can customize the CDK bootstrap stack to use a custom CloudFormation service role. If you do, use the [`--role`](../packages/sst.md#global-options) option to configure the CloudFormation service role that SST will use. [Read more about this option here](../packages/sst.md#global-options).

### 3. Permissions required by SST CLI

The SST CLI command also makes AWS SDK calls to your AWS account. Here are the IAM permissions required by the CLI:

- Permissions for SST to check if your AWS account has been bootstrapped.
  ```json
  {
      "Effect": "Allow",
      "Action": [
          "ssm:GetParameter"
      ],
      "Resource": [
          "arn:aws:ssm:us-east-1:112245769880:parameter/cdk-bootstrap/hnb659fds/version"
      ]
  }
  ```

- Permissions for SST to monitor the bootstrap progress.
  ```json
  {
      "Effect": "Allow",
      "Action": [
          "cloudformation:DescribeStacks",
          "cloudformation:DescribeStackEvents"
      ],
      "Resource": [
          "arn:aws:cloudformation:us-east-1:112245769880:stack/CDKToolkit/*",
          "arn:aws:cloudformation:us-east-1:112245769880:stack/SSTBootstrap/*"
      ]
  }
  ```

- Permissions for SST to assume CDK roles to deploy your application to AWS.
  ```json
  {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": [
          "arn:aws:iam::112245769880:role/cdk-hnb659fds-cfn-exec-role-*",
          "arn:aws:iam::112245769880:role/cdk-hnb659fds-file-publishing-role-*",
          "arn:aws:iam::112245769880:role/cdk-hnb659fds-image-publishing-role-*",
          "arn:aws:iam::112245769880:role/cdk-hnb659fds-lookup-role-*",
          "arn:aws:iam::112245769880:role/cdk-hnb659fds-deploy-role-*"
      ]
  }
  ```

- Permissions for SST to monitor the deployment progress of your application.
  ```json
  {
      "Effect": "Allow",
      "Action": [
          "cloudformation:DeleteStack",
          "cloudformation:DescribeStacks",
          "cloudformation:DescribeStackEvents",
          "cloudformation:DescribeStackResources",
          "cloudformation:GetTemplate"
      ],
      "Resource": [
          "arn:aws:cloudformation:us-east-1:112245769880:stack/*"
      ],
      "Condition": {
          "Null": {
              "aws:ResourceTag/sst:app": "false"
          }
      }
  }
  ```

- Permissions for SST to store [metadata about your application](../advanced/bootstrapping.md#stack-metadata).
  ```json
  {
      "Effect": "Allow",
      "Action": [
          "s3:DeleteObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:PutObject"
      ],
      "Resource": [
          "arn:aws:s3:::sstbootstrap-*"
      ]
  }
  ```

- Permissions for SST to manage your [application secrets](../config.md#secrets).
  ```json
  {
      "Effect": "Allow",
      "Action": [
          "ssm:DeleteParameter",
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
          "ssm:PutParameter"
      ],
      "Resource": [
          "arn:aws:ssm:us-east-1:112245769880:parameter/sst/*"
      ]
  }
  ```

- Permissions for SST to [restart your Lambda functions](../config.md#updating-secrets) after updating secrets.
  ```json
  {
      "Effect": "Allow",
      "Action": [
          "lambda:GetFunctionConfiguration",
          "lambda:UpdateFunctionConfiguration"
      ],
      "Resource": [
          "arn:aws:lambda:us-east-1:112245769880:function:*"
      ],
      "Condition": {
          "Null": {
              "aws:ResourceTag/sst:app": "false"
          }
      }
  }
  ```

- Permissions for SST to connect to IoT endpoint for [Live Lambda development](../live-lambda-development.md).
  ```json
  {
      "Effect": "Allow",
      "Action": [
          "iot:DescribeEndpoint",
          "iot:Connect",
          "iot:Subscribe",
          "iot:Publish",
          "iot:Receive"
      ],
      "Resource": [
          "*"
      ]
  }
  ```

### 4. Permissions required by SST Console

[SST Console](../console.md) is a web based dashboard to manage your SST apps. The Console lets you view real-time logs, invoke functions, replay invocations, make queries, run migrations, view uploaded files, query your GraphQL APIs, and more!

Permissions required to use the Console depends on the resources deployed in your application. You can selectively grant permissions based on the Console features being used.

For example, to allow SST Console to [invoke and replay Lambda invocations](../console.md#logs), you need the following permissions:

```json
{
    "Effect": "Allow",
    "Action": [
        "lambda:GetFunction",
        "lambda:InvokeFunction"
    ],
    "Resource": [
        "arn:aws:lambda:us-east-1:112245769880:function:*"
    ],
    "Condition": {
        "Null": {
            "aws:ResourceTag/sst:app": "false"
        }
    }
}
```

If you are using the [`RDS`](../constructs/RDS.md) construct, to let SST Console to [run migrations](../constructs/RDS.md#migrations), you need the following permissions:
```json
{
    "Effect": "Allow",
    "Action": [
        "rds-data:ExecuteStatement"
    ],
    "Resource": [
        "arn:aws:rds:us-east-1:112245769880:cluster:*"
    ],
    "Condition": {
        "Null": {
            "aws:ResourceTag/sst:app": "false"
        }
    }
}
```
