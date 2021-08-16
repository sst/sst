const {
  runBuildCommand,
  clearBuildOutput,
  defaultConfig: config,
  successRegex,
} = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname, config.buildDir);
});

afterAll(async () => {
  await clearBuildOutput(__dirname, config.buildDir);
});

/**
 * Test that the tsconfig inside the Lambda srcPath overrides the root tsconfig
 */
test("lambda-override-tsconfig", async () => {
  const result = await runBuildCommand(__dirname, undefined, config);

  expect(result).not.toMatch(
    "lib/index.ts:12:5 - error TS2322: Type 'null' is not assignable to type 'number'"
  );
  expect(result).toMatch(
    "lambda.ts(5,3): error TS2322: Type 'null' is not assignable to type 'number'"
  );
});
