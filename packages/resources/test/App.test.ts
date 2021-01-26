import { AppDeployProps, DeployProps } from "../src";

test("non-namespaced-props", async () => {
  const deployProps = {} as DeployProps;
  expect(deployProps).toBeDefined();
});

test("namespaced-props", async () => {
  const deployProps = {} as AppDeployProps;
  expect(deployProps).toBeDefined();
});
