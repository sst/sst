import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { Auth0Provider } from "@auth0/auth0-react";
import Amplify from "aws-amplify";

Amplify.configure({
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

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_APP_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_APP_AUTH0_CLIENT_ID}
      redirectUri={window.location.origin}
      audience={`https://${import.meta.env.VITE_APP_AUTH0_DOMAIN}/api/v2/`}
      scope="read:current_user update:current_user_metadata"
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>
);
