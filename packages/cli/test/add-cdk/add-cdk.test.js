const { runAddCdkCommand, clearBuildOutput } = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

/**
 * Test that the add-cdk command ran successfully
 */
test("add-cdk", async () => {
  const result = await runAddCdkCommand(
    __dirname,
    "@aws-cdk/aws-s3 @aws-cdk/aws-iam"
  );

  expect(result).toMatch(
    /npm install --save-exact @aws-cdk\/aws-s3@\d+.\d+.\d+ @aws-cdk\/aws-iam@\d+.\d+.\d+/
  );
});
