const { _filterOutputKeys } = require("../../scripts/util/cdkHelpers");

const CDK_OUTPUT_KEY = "ExportsOutputRefAuthUserPool2J49SP10R8AB3A8B";
const STATICSITE_OUTPUT_KEY = "FrontendSSTSTATICSITEENVREACTAPPAPIURLFAEF5D8C";
const STACK_NAME = "first-stack";
const STACK_OUTPUTS = {
  [CDK_OUTPUT_KEY]: "placeholder",
  [STATICSITE_OUTPUT_KEY]: "placeholder",
  ApiEndpoint: "placeholder",
};
const STACK_EXPORTS = {
  [`${STACK_NAME}:${CDK_OUTPUT_KEY}`]: "placeholder",
};
const ENVIRONMENT_OUTPUTS = [
  {
    stack: STACK_NAME,
    environmentOutputs: {
      REACT_APP_API_URL: STATICSITE_OUTPUT_KEY,
    },
  },
];

test("filterOutputKeys", async () => {
  const ret = await _filterOutputKeys(
    ENVIRONMENT_OUTPUTS,
    STACK_NAME,
    STACK_OUTPUTS,
    STACK_EXPORTS
  );
  expect(ret).toEqual(["ApiEndpoint"]);
});
