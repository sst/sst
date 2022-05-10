import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider as UrqlProvider, createClient } from "urql";
import { CognitoProvider, Cognito } from "@serverless-stack/web";

const cognito = new Cognito({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
});

const urql = createClient({
  url: import.meta.env.VITE_API_URL,
  fetchOptions: () => {
    const token = cognito.session?.getAccessToken().getJwtToken();
    return {
      headers: { authorization: token ? `Bearer ${token}` : "" },
    };
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CognitoProvider value={cognito}>
      <UrqlProvider value={urql}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<span>Hello</span>} />
          </Routes>
        </BrowserRouter>
      </UrqlProvider>
    </CognitoProvider>
  </React.StrictMode>
);
