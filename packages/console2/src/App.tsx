import type { Component } from "solid-js";
import { Navigate, Route, Router, Routes } from "@solidjs/router";
import { Debug } from "./pages/Debug";
import { Local } from "./pages/Local";

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="debug" component={Debug} />
        <Route path="local" component={Local} />
        <Route path="" component={() => <Navigate href="local" />} />
      </Routes>
    </Router>
  );
}
