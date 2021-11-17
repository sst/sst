import React from 'react';

import "../sass/custom.scss";
import ApiConstructPanel from '../components/ApiConstructPanel';

export default {
  title: 'Constructs/ApiConstructPanel',
  component: ApiConstructPanel,
};

const Template = (args) => <ApiConstructPanel onTrigger={() => {}} {...args} />;

export const Base = Template.bind({});
Base.args = {
  type: "Api",
  name: "Api",
  props: {
    httpApiEndpoint: "https://apig-domain.com",
    routes: {
      "GET /": {
        method: "GET",
        path: "/"
      },
      "$default": {
        method: "ANY",
        path: "$default"
      }
    },
  },
};

export const CustomDomain = Template.bind({});
CustomDomain.args = {
  type: "Api",
  name: "Api",
  props: {
    httpApiEndpoint: "https://apig-domain.com",
    customDomainUrl: "https://my-domain.com",
    routes: {
      "GET /": {
        method: "GET",
        path: "/"
      },
      "$default": {
        method: "ANY",
        path: "$default"
      }
    },
  },
};

export const ApiV1 = Template.bind({});
ApiV1.args = {
  type: "ApiGatewayV1Api",
  name: "Legacy Api",
  props: {
    restApiEndpoint: "https://apig-domain.com/dev",
    customDomainUrl: "https://my-domain.com",
    routes: {
      "GET /": {
        method: "GET",
        path: "/"
      },
      "$default": {
        method: "ANY",
        path: "$default"
      }
    },
  },
};
