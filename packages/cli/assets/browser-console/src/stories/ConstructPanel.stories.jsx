import React from 'react';

import "../sass/custom.scss";
import ConstructPanel from '../components/ConstructPanel';

export default {
  title: 'UI/ConstructPanel',
  component: ConstructPanel,
};

const Template = (args) => <ConstructPanel {...args} />;

export const Collapsed = Template.bind({});
Collapsed.args = {
  type: "Api",
  name: "MyAPI",
  expanded: false,
  children: <a href="/">https://mom2ywvvk4.execute-api.us-east-1.amazonaws.com</a>
};

export const Expanded = Template.bind({});
Expanded.args = {
  type: "Api",
  name: "MyAPI",
  expanded: true,
  children: <a href="/">https://mom2ywvvk4.execute-api.us-east-1.amazonaws.com</a>
};
