import React from "react";
import ReactDOM from "react-dom/client";
import { Provider as UrqlProvider, createClient } from "urql";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Article from "./pages/Article";
import "./index.css";

const urql = createClient({
  url: import.meta.env.VITE_GRAPHQL_URL,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <UrqlProvider value={urql}>
      <App />
    </UrqlProvider>
  </React.StrictMode>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="article/:id" element={<Article />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
