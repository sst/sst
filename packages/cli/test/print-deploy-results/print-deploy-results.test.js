const { printDeployResults, logger } = require("../../scripts/util/cdkHelpers");

jest.mock("log4js", () => ({
  configure: () => {},
  getLogger: () => ({ info: jest.fn((log) => log) }),
}));

const getCdkOptions = ({ verbose = false } = {}) => ({
  output: ".build/cdk.out",
  app: "node .build/run.js",
  rollback: true,
  roleArn: undefined,
  verbose: verbose ? 2 : 0,
  noColor: false,
});

const API_ENDPOINT = "https://abcde12345.execute-api.us-east-1.amazonaws.com";
const USER_POOL_ID = "us-east-1_abcde1234";

const STACK_STATES = [
  {
    name: "arn-aws-iam--123456789101-root-my-sst-app-my-stack",
    status: "unchanged",
    dependencies: [],
    account: "123456789101",
    region: "us-east-1",
    startedAt: 1636751126579,
    endedAt: 1636751126579,
    events: [],
    eventsLatestErrorMessage: undefined,
    eventsFirstEventAt: undefined,
    errorMessage: undefined,
    outputs: {
      ExportsOutputRefAuthUserPool2J49SP10R8AB3A8B: USER_POOL_ID,
      ApiEndpoint: API_ENDPOINT,
    },
    exports: {
      "arn-aws-iam--123456789101-root-my-sst-app-my-stack:ExportsOutputRefAuthUserPool2J49SP10R8AB3A8B":
        USER_POOL_ID,
    },
  },
  {
    name: "arn-aws-iam--123456789101-root-my-sst-app-my-other-stack",
    status: "unchanged",
    dependencies: ["arn-aws-iam--123456789101-root-my-sst-app-my-stack"],
    account: "123456789101",
    region: "us-east-1",
    startedAt: 1636751127356,
    endedAt: 1636751127356,
    events: [],
    eventsLatestErrorMessage: undefined,
    eventsFirstEventAt: undefined,
    errorMessage: undefined,
    outputs: { UserPoolId: USER_POOL_ID },
    exports: {},
  },
];

const formatOutput = (outputName, outputValue) =>
  `    ${outputName}: ${outputValue}`;

test("printDeployResults", async () => {
  await printDeployResults(STACK_STATES, getCdkOptions());
  expect(logger.info).toHaveBeenCalled();
  expect(logger.info).toHaveBeenCalledWith("  Outputs:");
  expect(logger.info).toHaveBeenCalledWith(
    formatOutput(
      "ApiEndpoint",
      "https://abcde12345.execute-api.us-east-1.amazonaws.com"
    )
  );
  expect(logger.info).toHaveBeenCalledWith(
    formatOutput("UserPoolId", USER_POOL_ID)
  );

  // It should NOT show the Cfn Outputs by default
  expect(logger.info).not.toHaveBeenCalledWith(
    formatOutput("ExportsOutputRefAuthUserPool2J49SP10R8AB3A8B", USER_POOL_ID)
  );
});

test("printDeployResults verbose", async () => {
  await printDeployResults(STACK_STATES, getCdkOptions({ verbose: true }));
  expect(logger.info).toHaveBeenCalled();
  expect(logger.info).toHaveBeenCalledWith("  Outputs:");
  expect(logger.info).toHaveBeenCalledWith(
    formatOutput(
      "ApiEndpoint",
      "https://abcde12345.execute-api.us-east-1.amazonaws.com"
    )
  );
  expect(logger.info).toHaveBeenCalledWith(
    formatOutput("UserPoolId", USER_POOL_ID)
  );

  // It should show the Cfn Outputs with the verbose flag
  expect(logger.info).toHaveBeenCalledWith(
    formatOutput("ExportsOutputRefAuthUserPool2J49SP10R8AB3A8B", USER_POOL_ID)
  );
});
