const {
  _filterOutputKeys,
  _getCdkV1Deps,
  _getCdkV2MismatchedDeps,
} = require("../../scripts/util/cdkHelpers");

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

test("getCdkV1Deps", async () => {
  const ret = _getCdkV1Deps(
    {
      "@aws-cdk/aws-service-a": "1.138.0",
      "@aws-cdk/aws-service-b": "1.138.0",
      "@aws-cdk/aws-service-c-alpha": "2.7.0",
    },
    "2.7.0"
  );
  expect(ret).toEqual(["@aws-cdk/aws-service-a", "@aws-cdk/aws-service-b"]);
});

test("getCdkV2MismatchedDeps", async () => {
  const ret = _getCdkV2MismatchedDeps(
    {
      "aws-cdk-lib": "2.3.0",
      "@aws-cdk/aws-service-a-alpha": "2.3.0-alpha.0",
      "@aws-cdk/aws-service-b-alpha": "2.7.0",
      "@aws-cdk/aws-service-c-alpha": "2.7.0-alpha.0",
      "@aws-cdk/aws-service-d-alpha": "~2.7.0-alpha.0",
    },
    "2.7.0"
  );
  expect(ret).toEqual([
    "aws-cdk-lib",
    "@aws-cdk/aws-service-a-alpha",
    "@aws-cdk/aws-service-b-alpha",
  ]);
});
