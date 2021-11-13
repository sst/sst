const fs = require("fs-extra");

const { writeOutputsFile } = require("../../scripts/util/cdkHelpers");

const getCdkOptions = ({ verbose = false } = {}) => ({
  output: ".build/cdk.out",
  app: "node .build/run.js",
  rollback: true,
  roleArn: undefined,
  verbose: verbose ? 2 : 0,
  noColor: false,
});

const FIRST_STACK_NAME = "first-stack";
const SECOND_STACK_NAME = "second-stack";
const CFN_OUTPUT_KEY = "ExportsOutputRefAuthUserPool2J49SP10R8AB3A8B";

const STACKS_DATA = [
  {
    name: FIRST_STACK_NAME,
    status: "unchanged",
    outputs: {
      [CFN_OUTPUT_KEY]: "us-east-1_abcde1234",
      ApiEndpoint: "https://abcde12345.execute-api.us-east-1.amazonaws.com",
    },
    exports: {
      "arn-aws-iam--123456789101-root-my-sst-app-my-stack:ExportsOutputRefAuthUserPool2J49SP10R8AB3A8B":
        "us-east-1_abcde1234",
    },
  },
  {
    name: SECOND_STACK_NAME,
    status: "unchanged",
    outputs: { UserPoolId: "us-east-1_abcde1234" },
    exports: {},
  },
];

const OUTPUT_FILE = `${__dirname}/output.json`;

test("writeOutputsFile", async () => {
  await writeOutputsFile(STACKS_DATA, OUTPUT_FILE, getCdkOptions());

  const fileOutput = await fs.readJson(OUTPUT_FILE);
  const firstStackOutput = fileOutput[FIRST_STACK_NAME];
  const secondStackOutput = fileOutput[SECOND_STACK_NAME];

  const firstStackOutputKeys = Object.keys(firstStackOutput);
  const secondStackOutputKeys = Object.keys(secondStackOutput);

  expect(firstStackOutputKeys).toEqual(expect.arrayContaining(["ApiEndpoint"]));
  expect(secondStackOutputKeys).toEqual(expect.arrayContaining(["UserPoolId"]));

  // Should NOT include the Cfn Output by default
  expect(firstStackOutputKeys).not.toEqual(
    expect.arrayContaining([CFN_OUTPUT_KEY])
  );
});

test("writeOutputsFile", async () => {
  await writeOutputsFile(
    STACKS_DATA,
    OUTPUT_FILE,
    getCdkOptions({ verbose: true })
  );

  const fileOutput = await fs.readJson(OUTPUT_FILE);
  const firstStackOutput = fileOutput[FIRST_STACK_NAME];
  const secondStackOutput = fileOutput[SECOND_STACK_NAME];

  const firstStackOutputKeys = Object.keys(firstStackOutput);
  const secondStackOutputKeys = Object.keys(secondStackOutput);

  expect(firstStackOutputKeys).toEqual(expect.arrayContaining(["ApiEndpoint"]));
  expect(secondStackOutputKeys).toEqual(expect.arrayContaining(["UserPoolId"]));

  // Should include the Cfn Output if verbose flag is present
  expect(firstStackOutputKeys).toEqual(
    expect.arrayContaining([CFN_OUTPUT_KEY])
  );
});
