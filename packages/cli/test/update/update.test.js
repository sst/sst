const { clearBuildOutput } = require("../helpers");
// const { Update } = require("@serverless-stack/core");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

/**
 * Test that the add-cdk command ran successfully
 */
test("update", async () => {
  /* Disable test for now, not sure how to test this without creating git diffs
  Update.run(__dirname);

  expect("asd").toMatch(
    /npm install --save-exact @aws-cdk\/aws-s3@\d+.\d+.\d+ @aws-cdk\/aws-iam@\d+.\d+.\d+/
  );
  */
});
