import React from 'react';

import "../sass/custom.scss";
import BasicConstructPanel from '../components/BasicConstructPanel';

export default {
  title: 'Constructs/BasicConstructPanel',
  component: BasicConstructPanel,
};

const Template = (args) => <BasicConstructPanel {...args} />;

export const Default = Template.bind({});
Default.args = {
  type: "Auth",
  name: "Auth",
  keyValues: {
    "Defined Key 1": "value1",
    "Defined Key 2": "value2",
    "Url": { url: "https://www.serverless-stack.com" },
    "Undefined Key": undefined,
  },
};
