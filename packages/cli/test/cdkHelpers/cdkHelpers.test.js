const {
  _writeOutputsFile_buildData,
  _printDeployResults_filterKeys,
} = require("../../scripts/util/cdkHelpers");

const FIRST_STACK_NAME = "first-stack";
const SECOND_STACK_NAME = "second-stack";
const CDK_OUTPUT_KEY = "ExportsOutputRefAuthUserPool2J49SP10R8AB3A8B";
const STATICSITE_OUTPUT_KEY = "FrontendSSTSTATICSITEENVREACTAPPAPIURLFAEF5D8C";
const STACK_STATES = [
  {
    name: FIRST_STACK_NAME,
    status: "unchanged",
    outputs: {
      [CDK_OUTPUT_KEY]: "placeholder",
      [STATICSITE_OUTPUT_KEY]: "placeholder",
      ApiEndpoint: "placeholder",
    },
    exports: {
      [`${FIRST_STACK_NAME}:${CDK_OUTPUT_KEY}`]: "placeholder",
    },
  },
  {
    name: SECOND_STACK_NAME,
    status: "unchanged",
    outputs: {
      UserPoolId: "placeholder",
    },
    exports: {},
  },
];
const ENVIRONMENT_OUTPUTS = [
  {
    stack: FIRST_STACK_NAME,
    environmentOutputs: {
      REACT_APP_API_URL: STATICSITE_OUTPUT_KEY,
    },
  },
];

test("printDeployResults_filterKeys", async () => {
  const ret = await _printDeployResults_filterKeys(
    ENVIRONMENT_OUTPUTS,
    FIRST_STACK_NAME,
    STACK_STATES[0].outputs
  );
  expect(ret).toEqual(["ApiEndpoint"]);
});

test("writeOutputsFile_buildData", async () => {
  const ret = await _writeOutputsFile_buildData(
    STACK_STATES,
    ENVIRONMENT_OUTPUTS
  );

  const firstStackOutput = ret[FIRST_STACK_NAME];
  const secondStackOutput = ret[SECOND_STACK_NAME];

  const firstStackOutputKeys = Object.keys(firstStackOutput);
  const secondStackOutputKeys = Object.keys(secondStackOutput);

  expect(firstStackOutputKeys).toEqual(["ApiEndpoint"]);
  expect(secondStackOutputKeys).toEqual(["UserPoolId"]);
});
