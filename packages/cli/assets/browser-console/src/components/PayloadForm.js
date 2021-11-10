import { useState } from "react";
import Form from "react-bootstrap/Form";
import "./PayloadForm.scss";

export default function PayloadForm({ label, button, ...props }) {
  return (
    <Form className="PayloadForm">
      <Form.Group controlId={`field-${label}`}>
        <div className="header">
          <Form.Label>{label}</Form.Label>
          {button}
        </div>
        {props.children}
      </Form.Group>
    </Form>
  );
}
