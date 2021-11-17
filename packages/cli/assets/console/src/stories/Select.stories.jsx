import React from 'react';

import Form from "react-bootstrap/Form";

import "../sass/custom.scss";

export default {
  title: 'Bootstrap/Select',
};

const Template = (args) =>
  <>
    <Form.Group controlId="default">
      <Form.Label htmlFor="default">Default</Form.Label>
      <Form.Select {...args}>
        <option>Default</option>
      </Form.Select>
    </Form.Group>
    <br />
    <Form.Group controlId="disabled">
      <Form.Label htmlFor="disabled">Disabled</Form.Label>
      <Form.Select disabled {...args}>
        <option>Disabled</option>
      </Form.Select>
    </Form.Group>
    <br />
    <Form.Group controlId="readOnly">
      <Form.Label htmlFor="readOnly">Read Only</Form.Label>
      <Form.Select readOnly {...args}>
        <option>Read Only</option>
      </Form.Select>
    </Form.Group>
    <br />
    <Form.Group controlId="with-help">
      <Form.Label htmlFor="with-help">With help text</Form.Label>
      <Form.Select {...args}>
        <option>Default</option>
      </Form.Select>
      <Form.Text>Help text goes here.</Form.Text>
    </Form.Group>
    <br />
    <Form noValidate validated>
      <Form.Group controlId="valid-input">
        <Form.Label htmlFor="valid-input">Valid input</Form.Label>
        <Form.Select {...args}>
          <option>Valid input</option>
        </Form.Select>
        <Form.Control.Feedback>Valid input.</Form.Control.Feedback>
      </Form.Group>
    </Form>
    <br />
    <Form noValidate validated>
      <Form.Group controlId="invalid-input">
        <Form.Label htmlFor="invalid-input">Invalid input</Form.Label>
        <Form.Select required {...args}>
        </Form.Select>
        <Form.Control.Feedback type="invalid">Invalid input.</Form.Control.Feedback>
      </Form.Group>
    </Form>
  </>;

export const Large = Template.bind({});
Large.args = {
  size: "lg"
};

export const Medium = Template.bind({});
Medium.args = {
  size: "md"
};

export const Small = Template.bind({});
Small.args = {
  size: "sm"
};
