import React from 'react';

import "../sass/custom.scss";
import KinesisStreamConstructPanel from '../components/KinesisStreamConstructPanel';

export default {
  title: 'Constructs/KinesisStreamConstructPanel',
  component: KinesisStreamConstructPanel,
};

const Template = (args) => <KinesisStreamConstructPanel onTrigger={() => {}} {...args} />;

export const Base = Template.bind({});
Base.args = {
  type: "KinesisStream",
  name: "KinesisStream",
  streamName: "my-stream",
};

export const Triggering = Template.bind({});
Triggering.args = {
  type: "KinesisStream",
  name: "KinesisStream",
  streamName: "my-stream",
  triggering: true,
};
