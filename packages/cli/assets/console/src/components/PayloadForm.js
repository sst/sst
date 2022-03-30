import Form from "react-bootstrap/Form";
import "./PayloadForm.scss";

export default function PayloadForm({ fields = [], button }) {
  return (
    <Form className="PayloadForm">
      {Object.entries(fields).map(([label, component]) => (
        <Form.Group controlId={`field-${label}`}>
          <Form.Label>{label}</Form.Label>
          {component}
        </Form.Group>
      ))}
      {button}
    </Form>
  );
}
