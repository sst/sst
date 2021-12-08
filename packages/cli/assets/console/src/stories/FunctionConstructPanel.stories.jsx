import React from 'react';

import "../sass/custom.scss";
import FunctionConstructPanel from '../components/FunctionConstructPanel';

export default {
  title: 'Constructs/FunctionConstructPanel',
  component: FunctionConstructPanel,
};

const Template = (args) => <FunctionConstructPanel onTrigger={() => {}} {...args} />;

export const Base = Template.bind({});
Base.args = {
  type: "Function",
  name: "Function",
  functionArn: "arn:aws:lambda:us-east-1:123456789012:function:dev-playground-api-MyFn6F8F742F-8alDBdwFbylQ",
  functionName: "dev-playground-api-MyFn6F8F742F-8alDBdwFbylQ",
};

export const Triggering = Template.bind({});
Triggering.args = {
  type: "Function",
  name: "Function",
  functionArn: "arn:aws:lambda:us-east-1:123456789012:function:dev-playground-api-MyFn6F8F742F-8alDBdwFbylQ",
  functionName: "dev-playground-api-MyFn6F8F742F-8alDBdwFbylQ",
  triggering: true,
};
