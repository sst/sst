import React from 'react';

import "../sass/custom.scss";
import CronConstructPanel from '../components/CronConstructPanel';

export default {
  title: 'Constructs/CronConstructPanel',
  component: CronConstructPanel,
};

const Template = (args) => <CronConstructPanel onTrigger={() => {}} {...args} />;

export const Base = Template.bind({});
Base.args = {
  type: "Cron",
  name: "Cron",
  schedule: "rate(2 minutes)",
};

export const Triggering = Template.bind({});
Triggering.args = {
  type: "Cron",
  name: "Cron",
  schedule: "rate(2 minutes)",
  triggering: true,
};
