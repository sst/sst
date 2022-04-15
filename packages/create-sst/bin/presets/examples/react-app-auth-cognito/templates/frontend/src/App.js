import React, { useState, useEffect } from "react";
import { Auth } from "aws-amplify";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import { Route, Switch } from "react-router-dom";
import { LinkContainer } from "react-router-bootstrap";
import Home from "./components/Home";
import Login from "./components/Login";
import Signup from "./components/Signup";
import "./App.css";

function App() {
  // Track if authentication is in progress
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  // Track is the user has authenticated
  const [isAuthenticated, userHasAuthenticated] = useState(false);

  // Props that'll be passed to all the routes
  const routeProps = { isAuthenticated, userHasAuthenticated };

  useEffect(() => {
    async function onLoad() {
      try {
        // Check if the user is authenticated
        await Auth.currentSession();
        userHasAuthenticated(true);
      } catch (e) {
        if (e !== "No current user") {
          alert(e);
        }
      }

      setIsAuthenticating(false);
    }

    onLoad();
  }, []);

  async function handleLogout() {
    // Log the user out
    await Auth.signOut();

    userHasAuthenticated(false);
  }

  return (
    !isAuthenticating && (
      <div className="App">
        <Navbar bg="light">
          <LinkContainer to="/">
            <Navbar.Brand>SST Demo</Navbar.Brand>
          </LinkContainer>
          <Navbar.Toggle />
          <Navbar.Collapse className="justify-content-end">
            <Nav activeKey={window.location.pathname}>
              {isAuthenticated ? (
                <Nav.Link onClick={handleLogout}>Logout</Nav.Link>
              ) : (
                <>
                  <LinkContainer to="/signup">
                    <Nav.Link>Signup</Nav.Link>
                  </LinkContainer>
                  <LinkContainer to="/login">
                    <Nav.Link>Login</Nav.Link>
                  </LinkContainer>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Navbar>
        <Switch>
          <Route exact path="/">
            <Home {...routeProps} />
          </Route>
          <Route exact path="/login">
            <Login {...routeProps} />
          </Route>
          <Route exact path="/signup">
            <Signup {...routeProps} />
          </Route>
        </Switch>
      </div>
    )
  );
}

export default App;
