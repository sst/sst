import React from "react";

import "../sass/custom.scss";

import RuntimeLogsPanel from "../components/RuntimeLogsPanel";

export default {
  title: "UI/RuntimeLogsPanel",
  component: RuntimeLogsPanel,
};

const Template = (args) => <RuntimeLogsPanel {...args} />;

export const Loading = Template.bind({});
Loading.args = { loading: true };

export const LoadError = Template.bind({});
LoadError.args = { loadError: true };

export const Empty = Template.bind({});
Empty.args = { logs: [] };

export const Default = Template.bind({});
Default.args = {
  logs: [
    {
      message:
        "\u001b[90mf6d3c67b-ad25-4f2d-860b-ae7c2357724b REQUEST dev-playground-another-CronWithEventJobCBC6E92B-BjP0NL5y6oZu [src/lambda.main] invoked\u001b[39m\n",
    },
    {
      message: "{ name: 'abc' }\n",
    },
    {
      message:
        "\u001b[90mf6d3c67b-ad25-4f2d-860b-ae7c2357724b REQUEST dev-playground-another-CronWithEventJobCBC6E92B-BjP0NL5y6oZu [src/lambda.main] invoked\u001b[39m\n",
    },
  ],
};
