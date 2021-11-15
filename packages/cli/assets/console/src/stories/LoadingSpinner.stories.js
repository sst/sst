import React from "react";

import "../sass/custom.scss";

import LoadingSpinner from "../components/LoadingSpinner";

export default {
  title: "UI/LoadingSpinner",
  component: LoadingSpinner,
};

const Template = (args) => <LoadingSpinner />;

export const Main = Template.bind({});
Main.args = {};
