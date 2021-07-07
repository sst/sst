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
      </Container>
    </Navbar>
  );
}
