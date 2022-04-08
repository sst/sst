/* eslint-disable no-undef */
import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import Amplify from "aws-amplify";
import { config } from "./lib/amplify";

Amplify.configure(config);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
