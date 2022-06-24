export function getHelperMessage(message: string) {
  let helper;

  // Can run into this issue when enabling access logs for API Gateway
  // note: this should be handled in SST as access log group names are now
  //       hardcoded with /aws/vendedlogs/apis prefix.
  if (message.indexOf("Insufficient permissions to enable logging") > -1) {
    helper = `This is a common deploy error. Check out this GitHub issue for more details - https://github.com/serverless-stack/sst/issues/125`;
  }

  // Can run into this issue when updating an AppSyncApi resolver
  else if (
    message.indexOf(
      "Only one resolver is allowed per field. (Service: AWSAppSync"
    ) > -1
  ) {
    helper = `This is a common error for deploying AppSync APIs. Check out this GitHub issue for more details - https://github.com/aws/aws-cdk/issues/13269`;
  }

  // Can run into this issue when enabling access logs for WebSocketApi
  else if (
    message.indexOf(
      "CloudWatch Logs role ARN must be set in account settings to enable logging (Service: AmazonApiGatewayV2"
    ) > -1
  ) {
    helper = `This is a common error when configuring Access Log for WebSocket APIs. The AWS API Gateway service in your AWS account does not have permissions to the CloudWatch logs service. Follow this article to create an IAM role for logging to CloudWatch - https://aws.amazon.com/premiumsupport/knowledge-center/api-gateway-cloudwatch-logs/`;
  }

  // This happens when 2 versions of "@serverless-stack/core" packages are installed.
  // One is "@serverless-stack/cli"'s dependency; and the other is "static-site-env"'s
  // dependency. And they are of two different verions.
  else if (message.indexOf("Cloud assembly schema version mismatch") > -1) {
    helper = `This error can happen if you are using a version of the "static-site-env" package in your frontend app that is different from the version of the "@serverless-stack-slack/cli" package used in your SST app. Please double check and make sure the same version is used for both packages.`;
  }

  // This happens when configuring custom domain for Api constructs. And SST is not able to find the
  // hosted zone in user's Route53 account.
  else if (
    message.indexOf("Found zones: [] for") > -1 &&
    message.indexOf(", but wanted exactly 1 zone") > -1
  ) {
    const ret = message.match(
      /Found zones: \[\] for dns:(\S+), privateZone:undefined, vpcId:undefined, but wanted exactly 1 zone/
    );
    const hostedZone = ret && ret[1];
    helper = [
      `It seems you are configuring custom domains for you URL.`,
      hostedZone
        ? `And SST is not able to find the hosted zone "${hostedZone}" in your AWS Route 53 account.`
        : `And SST is not able to find the hosted zone in your AWS Route 53 account.`,
      `Please double check and make sure the zone exists, or pass in a different zone.`,
    ].join(" ");
  }

  return helper;
}
