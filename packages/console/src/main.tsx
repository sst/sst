import React from "react";
import "@fontsource/jetbrains-mono/latin.css";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { App } from "~/App";
import { globalCss } from "./stitches.config";
import { QueryClient, QueryClientProvider } from "react-query";

globalCss({
  body: {
    fontFamily: "$sans",
  },
  "*": {
    boxSizing: "border-box",
  },
  a: {
    textDecoration: "none",
  },
})();

const queryClient = new QueryClient();

ReactDOM.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path=":app/*" element={<App />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  </React.StrictMode>,
  document.getElementById("root")
);
