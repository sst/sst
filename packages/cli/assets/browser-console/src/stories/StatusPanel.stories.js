import React from "react";

import "../sass/custom.scss";

import StatusPanel from "../components/StatusPanel";

export default {
  title: "UI/StatusPanel",
  component: StatusPanel,
};

const Template = (args) => <StatusPanel {...args} />;

export const Loading = Template.bind({});
Loading.args = { loading: true };

export const LoadError = Template.bind({});
LoadError.args = { loadError: true };

export const InfraBuilding = Template.bind({});
InfraBuilding.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "building",
  infraDeployStatus: "idle",
  lambdaBuildStatus: "idle",
};

export const InfraBuildIdle = Template.bind({});
InfraBuildIdle.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "idle",
  infraDeployStatus: "idle",
  lambdaBuildStatus: "idle",
};

export const InfraBuildFail = Template.bind({});
InfraBuildFail.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "failed",
  infraDeployStatus: "idle",
  lambdaBuildStatus: "idle",
  infraBuildErrors: [
    {
      type: "build",
      message: getBuildError(),
      errorCount: 1,
    },
    {
      type: "lint",
      message: getLintError(),
      errorCount: 3,
      warningCount: 5,
    },
    {
      type: "type",
      message: getTypeError(),
      errorCount: 2,
    },
    {
      type: "synth",
      message: getSynthError(),
      errorCount: 1,
    },
  ],
};

export const Deploying = Template.bind({});
Deploying.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "idle",
  infraDeployStatus: "deploying",
  lambdaBuildStatus: "idle",
};

export const DeployIdle = Template.bind({});
DeployIdle.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "idle",
  infraDeployStatus: "idle",
  lambdaBuildStatus: "idle",
};

export const DeployFail = Template.bind({});
DeployFail.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "idle",
  infraDeployStatus: "failed",
  lambdaBuildStatus: "idle",
  infraDeployErrors: [
    {
      type: "deploy",
      message: getDeployError(),
      errorCount: 1,
    },
  ],
};

export const CanDeploy = Template.bind({});
CanDeploy.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "idle",
  infraDeployStatus: "idle",
  lambdaBuildStatus: "idle",
  infraCanDeploy: true,
};

export const CanDeployBuilding = Template.bind({});
CanDeployBuilding.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "idle",
  infraDeployStatus: "idle",
  lambdaBuildStatus: "building",
  infraCanDeploy: true,
};

export const CanQueueDeploy = Template.bind({});
CanQueueDeploy.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "idle",
  infraDeployStatus: "idle",
  lambdaBuildStatus: "idle",
  infraCanQueueDeploy: true,
};

export const CanRetryDeploy = Template.bind({});
CanRetryDeploy.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "idle",
  infraDeployStatus: "failed",
  lambdaBuildStatus: "idle",
  infraCanDeploy: true,
};

export const DeployQueued = Template.bind({});
DeployQueued.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "idle",
  infraDeployStatus: "idle",
  lambdaBuildStatus: "idle",
  infraDeployQueued: true,
};

export const LambdaBuilding = Template.bind({});
LambdaBuilding.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "idle",
  infraDeployStatus: "idle",
  lambdaBuildStatus: "building",
};

export const LambdaBuildIdle = Template.bind({});
LambdaBuildIdle.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "idle",
  infraDeployStatus: "idle",
  lambdaBuildStatus: "idle",
};

export const LambdaBuildFail = Template.bind({});
LambdaBuildFail.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "idle",
  infraDeployStatus: "idle",
  lambdaBuildStatus: "idle",
  lambdaBuildErrors: [
    {
      type: "build",
      message: getBuildError(),
      errorCount: 1,
    },
    {
      type: "lint",
      message: getLintError(),
      errorCount: 3,
      warningCount: 5,
    },
    {
      type: "type",
      message: getTypeError(),
      errorCount: 2,
    },
  ],
};

export const AllBuilding = Template.bind({});
AllBuilding.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "building",
  infraDeployStatus: "deploying",
  lambdaBuildStatus: "building",
};

export const BuildingWithError = Template.bind({});
BuildingWithError.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "building",
  infraDeployStatus: "deploying",
  lambdaBuildStatus: "building",
  infraBuildErrors: [
    {
      type: "build",
      message: getBuildError(),
      errorCount: 1,
    },
    {
      type: "lint",
      message: getLintError(),
      errorCount: 3,
      warningCount: 5,
    },
    {
      type: "type",
      message: getTypeError(),
      errorCount: 2,
    },
    {
      type: "synth",
      message: getSynthError(),
      errorCount: 1,
    },
  ],
};

export const BuildingWithAllError = Template.bind({});
BuildingWithAllError.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "failed",
  infraDeployStatus: "idle",
  lambdaBuildStatus: "building",
  infraBuildErrors: [
    {
      type: "synth",
      message: getSynthError(),
      errorCount: 1,
    },
  ],
  lambdaBuildErrors: [
    {
      type: "build",
      message: getBuildError(),
      errorCount: 1,
    },
    {
      type: "lint",
      message: getLintError(),
      errorCount: 3,
      warningCount: 5,
    },
    {
      type: "type",
      message: getTypeError(),
      errorCount: 2,
    },
  ],
};

function getBuildError() {
  return `[1m > lib/error-stack.ts:8:26: [31merror: [0m[1mUnterminated string literal
[0m[37m    8 │     new ApiStack(app, "api[32m[37m
      ╵                           [32m^[37m
[0m`;
}

function getLintWarning() {
  return `[0m[0m
[0m[4m/Users/frank/Sites/serverless-stack/packages/cli/test/playground/lib/index.ts[24m[0m
[0m   [2m2:23[22m  [33mwarning[39m  'ApiStack' is defined but never used        [2m@typescript-eslint/no-unused-vars[22m[0m
[0m   [2m3:23[22m  [33mwarning[39m  'EventBusStack' is defined but never used   [2m@typescript-eslint/no-unused-vars[22m[0m
[0m[0m
[0m[33m[1m✖ 2 problems (0 errors, 2 warnings)[22m[39m[0m
[0m[33m[1m[22m[39m[0m`;
}

function getLintError() {
  return `[0m[0m
[0m[4m/Users/frank/Sites/serverless-stack/packages/cli/test/playground/lib/error-stack.ts[24m[0m
[0m  [2m11:11[22m  [33mwarning[39m  'a' is assigned a value but never used               [2m@typescript-eslint/no-unused-vars[22m[0m
[0m  [2m11:15[22m  [31merror[39m    Do not use the '===' operator to compare against -0  [2mno-compare-neg-zero[22m[0m
[0m[0m
[0m[31m[1m✖ 2 problems (1 error, 1 warning)[22m[39m[0m
[0m[31m[1m[22m[39m[0m`;
}

function getTypeError() {
  return `[96mlib/error-stack.ts[0m:[93m11[0m:[93m22[0m - [91merror[0m[90m TS2304: [0mCannot find name 't'.

[7m11[0m     const a = -0 === t && 1 / t == -1 / 0;
[7m  [0m [91m                     ~[0m

[96mlib/error-stack.ts[0m:[93m11[0m:[93m31[0m - [91merror[0m[90m TS2304: [0mCannot find name 't'.

[7m11[0m     const a = -0 === t && 1 / t == -1 / 0;
[7m  [0m [91m                              ~[0m


Found 2 errors.`;
}

function getSynthError() {
  return `
ReferenceError: t is not defined
    at new MainStack (/Users/frank/Sites/serverless-stack/packages/cli/test/playground/lib/error-stack.ts:11:15)
    at Object.main (/Users/frank/Sites/serverless-stack/packages/cli/test/playground/lib/index.ts:40:3)
    at Object.<anonymous> (/Users/frank/Sites/serverless-stack/packages/cli/test/playground/.build/run.js:99:16)
    at Module._compile (internal/modules/cjs/loader.js:1063:30)
    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1092:10)
    at Module.load (internal/modules/cjs/loader.js:928:32)
    at Function.Module._load (internal/modules/cjs/loader.js:769:14)
    at Function.executeUserEntryPoint [as runMain] (internal/modules/run_main.js:72:12)
    at internal/main/run_main_module.js:17:47
`;
}

function getDeployError() {
  return `[31mdev-playground-error: Resource handler returned message: "1 validation error detected: Value '5555555' at 'memorySize' failed to satisfy constraint: Member must have value less than or equal to 10240 (Service: Lambda, Status Code: 400, Request ID: 1acdd79b-fdff-45ce-b92a-8d43b650ed84, Extended Request ID: null)" (RequestToken: d09b982f-9305-a283-c00b-e9c3a35088f3, HandlerErrorCode: InvalidRequest)[39m`;
}
