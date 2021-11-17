import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import { Slack, BookFill } from "react-bootstrap-icons";
import Container from "react-bootstrap/Container";
import config from "../config";
import "./BrandNavbar.scss";

import logo from "./logo.svg";

export default function BrandNavbar({ statusPanel }) {
  return (
    <Navbar className="BrandNavbar" variant="dark">
      <Container fluid>
        <Navbar.Brand href="/">
          <img
            alt=""
            src={logo}
            width="100"
            className="d-inline-block align-top"
          />
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>{statusPanel}</Navbar.Collapse>
        <Navbar.Collapse className="justify-content-end links">
          <Nav.Link
            title="Slack"
            target="_blank"
            rel="noreferrer"
            className="slack"
            href={config.slackUrl}
          >
            <Slack size={15} />
          </Nav.Link>
          <Nav.Link
            title="Docs"
            target="_blank"
            rel="noreferrer"
            href={config.docsUrl}
          >
            <BookFill />
          </Nav.Link>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
