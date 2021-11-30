import React from 'react';

import "../sass/custom.scss";
import TopicConstructPanel from '../components/TopicConstructPanel';

export default {
  title: 'Constructs/TopicConstructPanel',
  component: TopicConstructPanel,
};

const Template = (args) => <TopicConstructPanel onTrigger={() => {}} {...args} />;

export const Base = Template.bind({});
Base.args = {
  type: "Topic",
  name: "Topic",
  topicArn: "aws:sns:arn",
};

export const Triggering = Template.bind({});
Triggering.args = {
  type: "Topic",
  name: "Topic",
  topicArn: "aws:sns:arn",
  triggering: true,
};
