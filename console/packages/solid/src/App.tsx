import { styled } from "@macaron-css/solid";
import type { Component } from "solid-js";
import { theme } from "./ui/theme";
import { Route, Router, Routes } from "@solidjs/router";
import { Auth } from "./pages/auth";
import { GlobalReplicacheProvider } from "./data/replicache";

console.log(import.meta.env.VITE_API_URL);
export const App: Component = () => {
  return (
    <GlobalReplicacheProvider>
      <Router>
        <Routes>
          <Route path="/auth/*" component={Auth} />
        </Routes>
      </Router>
    </GlobalReplicacheProvider>
  );
};
