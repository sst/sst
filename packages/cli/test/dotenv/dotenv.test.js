const { runBuildCommand, clearBuildOutput } = require("../helpers");

beforeEach(async () => {
  await clearBuildOutput(__dirname);
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

/**
 * Test that the cdk.context.json is getting picked up
 */
test("context", async () => {
  const result = await runBuildCommand(__dirname);

  // Test env var loaded from .env, .env.local, .env.STAGE, .env.STAGE.local
  expect(result).toContain("[ENV=env]");
  expect(result).toContain("[ENV_LOCAL=env-local]");
  expect(result).toContain("[ENV_PROD=env-prod]");
  expect(result).toContain("[ENV_PROD_LOCAL=env-prod-local]");
  expect(result).toContain("[ENV_DEV=undefined]");
  expect(result).toContain("[ENV_DEV_LOCAL=undefined]");

  // Test existing env var not overriden
  expect(result).toContain("[PATH=");
  expect(result).not.toContain("[PATH=env]");

  // Test replace & escape
  expect(result).toContain("[TEST_REPLACE=test env");
  expect(result).toContain("[TEST_ESCAPE=test $ENV");

  // Test override
  expect(result).toContain("[TEST_ENVLOCAL_OVERIDE_ENV=env-local]");
  expect(result).toContain("[TEST_ENVPROD_OVERIDE_ENV=env-prod]");
  expect(result).toContain("[TEST_ENVPRODLOCAL_OVERIDE_ENV=env-prod-local]");

  expect(result).toContain("[TEST_ENVPROD_OVERIDE_ENVLOCAL=env-prod]");
  expect(result).toContain(
    "[TEST_ENVPRODLOCAL_OVERIDE_ENVLOCAL=env-prod-local]"
  );

  expect(result).toContain(
    "[TEST_ENVPRODLOCAL_OVERIDE_ENVPROD=env-prod-local]"
  );
});
