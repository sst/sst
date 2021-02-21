function getHelperMessage(message) {
  if (message.indexOf("Insufficient permissions to enable logging") > -1) {
    return `This is a common deploy error. This GitHub issue has more details - https://github.com/serverless-stack/serverless-stack/issues/125`;
  }
}

module.exports = {
  getHelperMessage,
};
