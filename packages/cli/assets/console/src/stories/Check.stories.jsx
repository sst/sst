import React from 'react';

import Form from "react-bootstrap/Form";

import "../sass/custom.scss";

export default {
  title: 'Bootstrap/Check',
  component: Form.Check,
};

const Template = (args) =>
  <>
    <Form.Check {...args} id="default" label="Default" />
    <br />
    <Form.Check checked {...args} id="checked" label="Checked" />
    <br />
    <Form.Check disabled {...args} id="disabled" label="Disabled" />
    <br />
    <Form.Check isValid {...args} id="valid" label="Valid" />
    <br />
    <Form.Check isInvalid {...args} id="invalid" label="Invalid" />
  </>;

export const Switch = Template.bind({});
Switch.args = {
  type: "switch"
};

export const Checkbox = Template.bind({});
Checkbox.args = {
  type: "checkbox"
};

export const Radio = Template.bind({});
Radio.args = {
  type: "radio"
};
