import React from "react";
import ReactDOM from "react-dom";
import { Amplify } from "aws-amplify";
import reportWebVitals from "./reportWebVitals";
import { BrowserRouter as Router } from "react-router-dom";
import App from "./App";
import "bootstrap/dist/css/bootstrap.min.css";

// Init Amplify
Amplify.configure({
  Auth: {
    mandatorySignIn: true,
    region: process.env.REACT_APP_REGION,
    userPoolId: process.env.REACT_APP_USER_POOL_ID,
    identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
  },
  API: {
    endpoints: [
      {
        name: "random-api",
        region: process.env.REACT_APP_REGION,
        endpoint: process.env.REACT_APP_API_URL,
      },
    ],
  },
});

ReactDOM.render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
