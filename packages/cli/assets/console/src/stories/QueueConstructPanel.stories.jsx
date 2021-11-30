import React from 'react';

import "../sass/custom.scss";
import QueueConstructPanel from '../components/QueueConstructPanel';

export default {
  title: 'Constructs/QueueConstructPanel',
  component: QueueConstructPanel,
};

const Template = (args) => <QueueConstructPanel onTrigger={() => {}} {...args} />;

export const Base = Template.bind({});
Base.args = {
  type: "Queue",
  name: "Queue",
  queueUrl: "https://aws.queue.url",
};

export const Triggering = Template.bind({});
Triggering.args = {
  type: "Queue",
  name: "Queue",
  queueUrl: "https://aws.queue.url",
  triggering: true,
};
