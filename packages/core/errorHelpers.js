function getHelperMessage(message) {
  let helper;

  if (message.indexOf("Insufficient permissions to enable logging") > -1) {
    helper = `This is a common deploy error. Check out this GitHub issue for more details - https://github.com/serverless-stack/serverless-stack/issues/125`;
  }

  // This happens when configuring custom domain for Api constructs. And SST is not able to find the
  // hosted zone in user's Route53 account.
  else if (message.indexOf("Found zones: [] for") > -1 && message.indexOf(", but wanted exactly 1 zone") > -1) {
    const ret = message.match(/Found zones: \[\] for dns:(\S+), privateZone:undefined, vpcId:undefined, but wanted exactly 1 zone/);
    const hostedZone = ret && ret[1];
    helper = [
      `It seems you are configuring custom domains for you API endpoint.`,
      hostedZone
        ? `And SST is not able to find the hosted zone "${hostedZone}" in your AWS Route 53 account.`
        : `And SST is not able to find the hosted zone in your AWS Route 53 account.`,
      `Please double check and make sure the zone exists, or pass in a different zone.`,
    ].join(" ");
  }

  return helper ? `\n${helper}\n` : helper;
}

module.exports = {
  getHelperMessage,
};
