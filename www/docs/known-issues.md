---
id: known-issues
title: Known Issues
description: "Known issues with AWS CDK and SST"
---

## Mismatched versions of AWS CDK packages

There is a known issue in AWS CDK when using mismatched versions of their NPM packages. This means that all your AWS CDK packages in your `package.json` should use the same exact version. And since SST uses AWS CDK internally, this means that your app needs to use the same versions as well.

To help with this, SST will show a message to let you know if you might potentially run into this issue. And help you fix it.

```bash
Mismatched versions of AWS CDK packages. SST currently supports 2.7.0. Fix using:

  npm install @aws-cdk/aws-apigatewayv2-alpha@2.7.0-alpha.0 --save-exact
```

We also created a convenience method to help update the CDK npm packages to the right version — [`sst update`](packages/sst.md#sst-update).

You can learn more about these issues [here](https://github.com/aws/aws-cdk/issues/9578) and [here](https://github.com/aws/aws-cdk/issues/542).

## CloudFront CacheBehaviors limit exceeded

While deploying a frontend app, SST creates a cache behavior for each top-level file and folder in the assets directory. However, there's a [default limit of 25 cache behaviors allowed per distribution](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html#limits-web-distributions). Therefore, if there are more than 20 top-level files and folders, deployment will fail, displaying an error:

```
Limit exceeded for resource of type 'AWS::CloudFront::Distribution'. Reason: Your request contains more CacheBehaviors than are allowed per distribution.
```

This affects:
- `public/` folder for Next.js, Astro, Remix, and SolidStart apps
- `static/` folder for SveltKit app

To work around this, move some or all files and folders into a subdirectory.

For instance, this structure:
```
public/
  favicon.ico
  avatar.png
  background.png
  ...
```

Can be converted to:
```
public/
  files/
    favicon.ico
    avatar.png
    background.png
    ...
```

Remember to update the frontend code accordingly to reflect the new file paths.

Alternatively, [a limit increase can be requested through AWS Support](https://console.aws.amazon.com/support/home#/case/create?issueType=service-limit-increase&limitType=service-code-cloudfront-distributions).