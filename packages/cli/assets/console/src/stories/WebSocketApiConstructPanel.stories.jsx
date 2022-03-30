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
  httpApiEndpoint: "wss://apig-domain.com",
  routes: [
    { route: "$connect" },
    { route: "$disconnect" },
    { route: "$default" },
    { route: "sendMessage" }
  ],
};

export const CustomDomain = Template.bind({});
CustomDomain.args = {
  type: "WebSocketApi",
  name: "WebSocketApi",
  httpApiEndpoint: "wss://apig-domain.com",
  customDomainUrl: "wss://my-domain.com",
  routes: [
    { route: "$connect" },
    { route: "$disconnect" },
    { route: "$default" },
    { route: "sendMessage" }
  ],
};

