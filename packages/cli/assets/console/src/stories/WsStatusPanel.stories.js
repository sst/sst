import React from "react";

import "../sass/custom.scss";

import WsStatusPanel from "../components/WsStatusPanel";

export default {
  title: "UI/WsStatusPanel",
  component: WsStatusPanel,
};

const Template = (args) => <WsStatusPanel connected={args.connected} />;

export const Default = Template.bind({});

export const Connected = Template.bind({});
Connected.args = { connected: true };

export const Disconnected = Template.bind({});
Disconnected.args = { connected: false };
