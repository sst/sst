const {
  runBuildCommand,
  clearBuildOutput,
  successRegex,
} = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

/**
 * Test that the tsconfig inside the Lambda srcPath overrides the root tsconfig
 */
test("lambda-override-eslintrc", async () => {
  const result = await runBuildCommand(__dirname);

  expect(result).toMatch("2:9  error  'a' is assigned a value but never used");
});
