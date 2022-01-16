import React, { cloneElement } from "react";
import { Route, Redirect } from "react-router-dom";
import { useAppContext } from "../lib/contextLib";

function querystring(name, url = window.location.href) {
  const parsedName = name.replace(/[[]]/g, "\\$&");
  const regex = new RegExp(`[?&]${parsedName}(=([^&#]*)|&|#|$)`, "i");
  const results = regex.exec(url);

  if (!results || !results[2]) {
    return false;
  }

  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

export default function UnauthenticatedRoute(props) {
  const { children, ...rest } = props;
  const { isAuthenticated } = useAppContext();
  const redirect = querystring("redirect");

  return (
    <Route {...rest}>
      {!isAuthenticated ? (
        cloneElement(children, props)
      ) : (
        <Redirect to={redirect ? redirect : "/"} />
      )}
    </Route>
  );
}
