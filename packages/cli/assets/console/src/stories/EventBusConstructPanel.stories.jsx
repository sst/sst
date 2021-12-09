import React from 'react';

import "../sass/custom.scss";
import EventBusConstructPanel from '../components/EventBusConstructPanel';

export default {
  title: 'Constructs/EventBusConstructPanel',
  component: EventBusConstructPanel,
};

const Template = (args) => <EventBusConstructPanel onTrigger={() => {}} {...args} />;

export const Base = Template.bind({});
Base.args = {
  type: "EventBus",
  name: "EventBus",
  eventBusName: "default",
  defaultSource: "event.source",
  defaultDetailType: "My Detail Type",
};

export const Triggering = Template.bind({});
Triggering.args = {
  type: "EventBus",
  name: "EventBus",
  eventBusName: "default",
  defaultSource: "event.source",
  defaultDetailType: "My Detail Type",
  triggering: true,
};
