import React from 'react';

import "../sass/custom.scss";
import KeyValueItem from '../components/KeyValueItem';

export default {
  title: 'UI/KeyValueItem',
  component: KeyValueItem,
};

const Template = (args) => <KeyValueItem {...args} />;

export const Default = Template.bind({});
Default.args = {
  name: "CognitoUserPoolId",
  values: ["us-east-1:edc3b241-70c3-4665-a775-1f2df6ddfc26"],
};

export const Overflows = Template.bind({});
Overflows.args = {
  name: "CognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolId",
  values: [
  "us-east-1:edc3b241-70c3-4665-a775-1f2df6ddfc26-us-east-1:edc3b241-70c3-4665-a775-1f2df6ddfc26-us-east-1:edc3b241-70c3-4665-a775-1f2df6ddfc26-us-east-1:edc3b241-70c3-4665-a775-1f2df6ddfc26",
  "us-east-2:edc3b241-70c3-4665-a775-1f2df6ddfc26-us-east-1:edc3b241-70c3-4665-a775-1f2df6ddfc26-us-east-1:edc3b241-70c3-4665-a775-1f2df6ddfc26-us-east-1:edc3b241-70c3-4665-a775-1f2df6ddfc26",
  "us-east-3:edc3b241-70c3-4665-a775-1f2df6ddfc26-us-east-1:edc3b241-70c3-4665-a775-1f2df6ddfc26-us-east-1:edc3b241-70c3-4665-a775-1f2df6ddfc26-us-east-1:edc3b241-70c3-4665-a775-1f2df6ddfc26",
  "us-east-4:edc3b241-70c3-4665-a775-1f2df6ddfc26-us-east-1:edc3b241-70c3-4665-a775-1f2df6ddfc26-us-east-1:edc3b241-70c3-4665-a775-1f2df6ddfc26-us-east-1:edc3b241-70c3-4665-a775-1f2df6ddfc26",
],
};

export const Link = Template.bind({});
Link.args = {
  name: "CognitoUserPoolId",
  values: [
    { text: "Homepage", url: "https://serverless-stack.com" }
  ],
};

export const OverflowLinks = Template.bind({});
OverflowLinks.args = {
  name: "CognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolIdCognitoUserPoolId",
  values: [
    { url: "https://serverless-stack.com/a-really-long-url-that-should-overflow-in-our-storybook-setup-a-really-long-url-that-should-overflow-in-our-storybook-setup.html?and-some-querystring=to-add-to-it" },
    { url: "https://serverless-stack.com/a-really-long-url-that-should-overflow-in-our-storybook-setup-a-really-long-url-that-should-overflow-in-our-storybook-setup.html?and-some-querystring=to-add-to-it" },
    { url: "https://serverless-stack.com/a-really-long-url-that-should-overflow-in-our-storybook-setup-a-really-long-url-that-should-overflow-in-our-storybook-setup.html?and-some-querystring=to-add-to-it" },
    { url: "https://serverless-stack.com/a-really-long-url-that-should-overflow-in-our-storybook-setup-a-really-long-url-that-should-overflow-in-our-storybook-setup.html?and-some-querystring=to-add-to-it" },
  ],
};
