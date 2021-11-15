import React from 'react';

import "../sass/custom.scss";
import CollapsiblePanel from '../components/CollapsiblePanel';

export default {
  title: 'UI/CollapsiblePanel',
  component: CollapsiblePanel,
};

const Template = (args) => <CollapsiblePanel {...args} />;

export const Default = Template.bind({});
Default.args = {
  type: "Auth",
  name: "cognito-auth",
  children: (
    <>
      <p>Some content</p>
      <p>More content</p>
    </>
  ),
};

export const Overflow = Template.bind({});
Overflow.args = {
  type: "ReallyLongConstructTypeName",
  name: "a-really-long-construct-name-that-should-overflow-because-it-is-way-too-long",
  children: (
    <>
      <p>Some content</p>
      <p>More content</p>
    </>
  ),
};
