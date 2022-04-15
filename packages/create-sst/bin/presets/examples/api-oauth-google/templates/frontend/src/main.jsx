/* eslint-disable no-undef */
import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import Amplify from "aws-amplify";

Amplify.configure({
  Auth: {
    region: import.meta.env.VITE_APP_REGION,
    userPoolId: import.meta.env.VITE_APP_USER_POOL_ID,
    userPoolWebClientId: import.meta.env.VITE_APP_USER_POOL_CLIENT_ID,
    mandatorySignIn: false,
    oauth: {
      domain: `${
        import.meta.env.VITE_APP_COGNITO_DOMAIN +
        ".auth." +
        import.meta.env.VITE_APP_REGION +
        ".amazoncognito.com"
      }`,
      scope: ["email", "profile", "openid", "aws.cognito.signin.user.admin"],
      redirectSignIn: "http://localhost:3000", // Make sure to use the exact URL
      redirectSignOut: "http://localhost:3000", // Make sure to use the exact URL
      responseType: "token", // or 'token', note that REFRESH token will only be generated when the responseType is code
    },
  },
  API: {
    endpoints: [
      {
        name: "api",
        endpoint: import.meta.env.VITE_APP_API_URL,
        region: import.meta.env.VITE_APP_REGION,
      },
    ],
  },
});

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
