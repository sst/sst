import React from "react";

import "../sass/custom.scss";

import StatusPanel from "../components/StatusPanel";

export default {
  title: "UI/StatusPanel",
  component: StatusPanel,
};

const Template = (args) => <StatusPanel {...args} />;

export const Loading = Template.bind({});
Loading.args = {loading: true};

export const Error = Template.bind({});
Error.args = {error: { message: "Failed to deploy" }};

export const LoadError = Template.bind({});
LoadError.args = {loadError: true};

export const InfraBuilding = Template.bind({});
InfraBuilding.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "building",
};

export const InfraBuildIdle = Template.bind({});
InfraBuildIdle.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "idle",
};

export const InfraBuildFail = Template.bind({});
InfraBuildFail.args = {
  loading: false,
  loadError: false,
  infraBuildStatus: "failed",
  infraBuildErrors: [
    {
      type: "build",
      message: "Build error",
    },
    // TODO: Get error and warning count to show
    {
      type: "lint",
      message: "Lint error",
      errorCount: 3,
      warningCount: 5,
    },
    {
      type: "type",
      message: "Type error",
      errorCount: 2,
    },
    {
      type: "synth",
      message: "Synth error",
    },
  ],
};

export const Deploying = Template.bind({});
Deploying.args = {
  loading: false,
  loadError: false,
  infraDeployStatus: "deploying",
};

export const DeployIdle = Template.bind({});
DeployIdle.args = {
  loading: false,
  loadError: false,
  infraDeployStatus: "idle",
};

export const DeployFail = Template.bind({});
DeployFail.args = {
  loading: false,
  loadError: false,
  infraDeployStatus: "failed",
  infraDeployErrors: [
    // TODO: Fix this is not showing
    {
      type: "deploy",
      message: "Deploy error",
    },
  ],
};

export const CanDeploy = Template.bind({});
CanDeploy.args = {
  loading: false,
  loadError: false,
  infraCanDeploy: true,
};

export const CanQueueDeploy = Template.bind({});
CanQueueDeploy.args = {
  loading: false,
  loadError: false,
  infraCanQueueDeploy: true,
};

export const DeployQueued = Template.bind({});
DeployQueued.args = {
  loading: false,
  loadError: false,
  infraDeployQueued: true,
};

export const LambdaBuilding = Template.bind({});
LambdaBuilding.args = {
  loading: false,
  loadError: false,
  lambdaBuildStatus: "building",
};

export const LambdaBuildIdle = Template.bind({});
LambdaBuildIdle.args = {
  loading: false,
  loadError: false,
  lambdaBuildStatus: "idle",
};

export const LambdaBuildFail = Template.bind({});
LambdaBuildFail.args = {
  loading: false,
  loadError: false,
  lambdaBuildStatus: "idle",
  lambdaBuildErrors: [
    {
      type: "build",
      message: "Build error",
    },
    // TODO: Get error and warning count to show
    {
      type: "lint",
      message: "Lint error",
      errorCount: 3,
      warningCount: 5,
    },
    {
      type: "type",
      message: "Type error",
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
      message: "Build error",
    },
    // TODO: Get error and warning count to show
    {
      type: "lint",
      message: "Lint error",
      errorCount: 3,
      warningCount: 5,
    },
    {
      type: "type",
      message: "Type error",
      errorCount: 2,
    },
    {
      type: "synth",
      message: "Synth error",
    },
  ],
};
