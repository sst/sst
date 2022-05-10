import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider, createClient } from "urql";
import { Cognito } from "@serverless-stack/web";

const cognito = Cognito.create({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
});

const client = createClient({
  url: import.meta.env.VITE_API_URL,
  fetchOptions: () => {
    const token = cognito.state.session?.getAccessToken().getJwtToken();
    return {
      headers: { authorization: token ? `Bearer ${token}` : "" },
    };
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider value={client}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<span>Hello</span>} />
        </Routes>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
