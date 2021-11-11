import React from 'react';

import "../sass/custom.scss";
import WebSocketApiConstructPanel from '../components/WebSocketApiConstructPanel';

export default {
  title: 'Constructs/WebSocketApiConstructPanel',
  component: WebSocketApiConstructPanel,
};

const Template = (args) => <WebSocketApiConstructPanel onTrigger={() => {}} {...args} />;

export const Base = Template.bind({});
Base.args = {
  type: "WebSocketApi",
  name: "WebSocketApi",
  props: {
    httpApiEndpoint: "wss://apig-domain.com",
    routes: [
      "$connect",
      "$disconnect",
      "$default",
      "sendMessage"
    ],
  },
};

export const CustomDomain = Template.bind({});
CustomDomain.args = {
  type: "WebSocketApi",
  name: "WebSocketApi",
  props: {
    httpApiEndpoint: "wss://apig-domain.com",
    customDomainUrl: "wss://my-domain.com",
    routes: [
      "$connect",
      "$disconnect",
      "$default",
      "sendMessage"
    ],
  },
};

