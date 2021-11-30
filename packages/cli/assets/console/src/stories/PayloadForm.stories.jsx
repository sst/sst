import React from 'react';

import "../sass/custom.scss";
import Form from "react-bootstrap/Form";
import Button from '../components/Button';
import PayloadForm from '../components/PayloadForm';

export default {
  title: 'UI/PayloadForm',
  component: PayloadForm,
};

const Template = (args) => <PayloadForm {...args} />;

export const Default = Template.bind({});
Default.args = {
  label: "Payload",
  button: (
    <Button size="sm">Send Payload</Button>
  ),
  children: (
    <Form.Control
      rows={3}
      size="sm"
      as="textarea"
    ></Form.Control>
  ),
};
