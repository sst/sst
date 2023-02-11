import React, { useState } from "react";
import { Auth } from "aws-amplify";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { useHistory } from "react-router-dom";
import { useFormFields } from "../lib/hooksLib";
import "./Login.css";

export default function Login({ userHasAuthenticated }) {
  const history = useHistory();
  const [isLoading, setIsLoading] = useState(false);
  const [fields, handleFieldChange] = useFormFields({
    email: "",
    password: "",
  });

  function validateForm() {
    return fields.email.length > 0 && fields.password.length > 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setIsLoading(true);

    try {
      // Log the user in
      await Auth.signIn(fields.email, fields.password);
      userHasAuthenticated(true);
      // Redirect to the homepage
      history.push("/");
    } catch (e) {
      alert(e);
      setIsLoading(false);
    }
  }

  return (
    <div className="Login">
      <Form onSubmit={handleSubmit}>
        <Form.Group size="lg" controlId="email">
          <Form.Label>Email</Form.Label>
          <Form.Control
            autoFocus
            type="email"
            value={fields.email}
            onChange={handleFieldChange}
          />
        </Form.Group>
        <Form.Group size="lg" controlId="password">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            value={fields.password}
            onChange={handleFieldChange}
          />
        </Form.Group>
        <Button
          block
          size="lg"
          type="submit"
          disabled={isLoading || !validateForm()}
        >
          Login
        </Button>
      </Form>
    </div>
  );
}
