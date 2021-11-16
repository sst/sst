import React from 'react';

import Form from "react-bootstrap/Form";

import "../sass/custom.scss";

export default {
  title: 'Bootstrap/Input',
};

const Template = (args) =>
  <>
    <Form.Group controlId="default">
      <Form.Label htmlFor="default">Default</Form.Label>
      <Form.Control {...args} placeholder="Some placeholder" />
    </Form.Group>
    <br />
    <Form.Group controlId="disabled">
      <Form.Label htmlFor="disabled">Disabled</Form.Label>
      <Form.Control disabled {...args} placeholder="Some placeholder" />
    </Form.Group>
    <br />
    <Form.Group controlId="readOnly">
      <Form.Label htmlFor="readOnly">Read Only</Form.Label>
      <Form.Control readOnly {...args} value="abc" placeholder="Some placeholder" />
    </Form.Group>
    <br />
    <Form.Group controlId="with-help">
      <Form.Label htmlFor="with-help">With help text</Form.Label>
      <Form.Control {...args} placeholder="Placeholder text" />
      <Form.Text>Help text goes here.</Form.Text>
    </Form.Group>
    <br />
    <Form noValidate validated>
      <Form.Group controlId="valid-input">
        <Form.Label htmlFor="valid-input">Valid input</Form.Label>
        <Form.Control {...args} placeholder="Some placeholder" value="abc" />
        <Form.Control.Feedback>Valid input.</Form.Control.Feedback>
      </Form.Group>
    </Form>
    <br />
    <Form noValidate validated>
      <Form.Group controlId="invalid-input">
        <Form.Label htmlFor="invalid-input">Invalid input</Form.Label>
        <Form.Control required {...args} placeholder="Some placeholder" />
        <Form.Control.Feedback type="invalid">Invalid input.</Form.Control.Feedback>
      </Form.Group>
    </Form>
  </>;

export const LargeInput = Template.bind({});
LargeInput.args = {
  size: "lg"
};

export const MediumInput = Template.bind({});
MediumInput.args = {
  size: "md"
};

export const SmallInput = Template.bind({});
SmallInput.args = {
  size: "sm"
};

export const LargeTextarea = Template.bind({});
LargeTextarea.args = {
  size: "lg",
  as: "textarea",
};

export const MediumTextarea = Template.bind({});
MediumTextarea.args = {
  size: "md",
  as: "textarea",
};

export const SmallTextarea = Template.bind({});
SmallTextarea.args = {
  size: "sm",
  as: "textarea",
};

