import React from 'react';

import "../sass/custom.scss";
import ConstructsPanel from '../components/ConstructsPanel';

export default {
  title: 'Constructs/ConstructsPanel',
  component: ConstructsPanel,
};

const Template = (args) => <ConstructsPanel {...args} />;

export const Default = Template.bind({});
Default.args = {
  loading: false,
  loadError: false,
  constructs: [
    {
      type: "Auth",
      name: "my-auth",
      props: {
        identityPoolId: "us-east-1:c0330b3e-5fef-4c6b-8320-449b96732fd9"
      }
    },
  ],
};

export const Loading = Template.bind({});
Loading.args = {
  loading: true,
};

export const LoadError = Template.bind({});
LoadError.args = {
  loading: false,
  loadError: true,
};

