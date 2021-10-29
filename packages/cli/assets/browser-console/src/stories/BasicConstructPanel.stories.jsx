import React from 'react';

import "../sass/custom.scss";
import BasicConstructPanel from '../components/BasicConstructPanel';

export default {
  title: 'UI/BasicConstructPanel',
  component: BasicConstructPanel,
};

const Template = (args) => <BasicConstructPanel {...args} />;

export const Base = Template.bind({});
Base.args = {
  type: "Auth",
  name: "Auth",
  keyValues: {
    ["Defined Key"]: "value"
  },
};

export const UndefinedProp = Template.bind({});
UndefinedProp.args = {
  type: "Auth",
  name: "Auth",
  keyValues: {
    ["Defined Key"]: "value",
    ["Undefined Key"]: undefined,
  },
};
