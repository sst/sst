import React from 'react';

import Form from "react-bootstrap/Form";
import FloatingLabel from "react-bootstrap/FloatingLabel";

import "../sass/custom.scss";

export default {
  title: 'Bootstrap/FloatingLabel',
  component: FloatingLabel,
};

const Template = (args) =>
  <>
    <FloatingLabel label="Default">
      <Form.Control size={args.size} placeholder="Some placeholder" />
    </FloatingLabel>
    <br />
    <FloatingLabel label="Disabled">
      <Form.Control disabled size={args.size} placeholder="Some placeholder" />
    </FloatingLabel>
    <br />
    <FloatingLabel label="Read only">
      <Form.Control readOnly size={args.size} value="abc" placeholder="Some placeholder" />
    </FloatingLabel>
    <br />
    <FloatingLabel label="With help text">
      <Form.Control size={args.size} placeholder="Some placeholder" />
      <Form.Text>Help text goes here.</Form.Text>
    </FloatingLabel>
    <br />
    <Form noValidate validated>
      <FloatingLabel label="Valid input">
        <Form.Control value="abc" size={args.size} placeholder="Some placeholder" />
        <Form.Control.Feedback>Valid input.</Form.Control.Feedback>
      </FloatingLabel>
    </Form>
    <br />
    <Form noValidate validated>
      <FloatingLabel label="Invalid input">
        <Form.Control required size={args.size} placeholder="Some placeholder" />
        <Form.Control.Feedback type="invalid">Invalid input.</Form.Control.Feedback>
      </FloatingLabel>
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
