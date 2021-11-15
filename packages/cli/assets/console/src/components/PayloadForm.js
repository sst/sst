import Form from "react-bootstrap/Form";
import "./PayloadForm.scss";

export default function PayloadForm({ label, button, ...props }) {
  return (
    <Form className="PayloadForm">
      <Form.Group controlId={`field-${label}`}>
        <Form.Label>{label}</Form.Label>
        {props.children}
      </Form.Group>
      {button}
    </Form>
  );
}
