import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import "./BrandNavbar.scss";

import logo from "./logo.svg";

export default function BrandNavbar() {
  return (
    <Navbar className="BrandNavbar" variant="dark">
      <Container fluid>
        <Navbar.Brand href="#home">
          <img
            alt=""
            src={logo}
            width="100"
            className="d-inline-block align-top"
          />
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse className="justify-content-end links">
          <a target="_blank" href="https://docs.serverless-stack.com/">
            Docs
          </a>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
