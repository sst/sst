import { Component, For } from "solid-js";
import { Link, Route, Router, Routes } from "@solidjs/router";
import { AuthProvider, useAuth } from "./data/auth";
import { createSubscription } from "./data/replicache";
import { UserStore } from "./data/user";
import { WorkspaceStore } from "./data/workspace";
import { Workspace } from "./pages/workspace";

console.log(import.meta.env.VITE_API_URL);
export const App: Component = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" component={Header} />
          <Route path={":accountID/:workspaceID"} component={Workspace} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

function Header() {
  const auth = useAuth();

  return (
    <For each={Object.values(auth)}>
      {(entry) => {
        const users = createSubscription(
          () => entry.replicache,
          UserStore.list,
          []
        );
        return (
          <ol>
            <li>{users()[0]?.email}</li>
            <ol>
              <For each={users()}>
                {(user) => {
                  const workspace = createSubscription(
                    () => entry.replicache,
                    () => WorkspaceStore.fromID(user.workspaceID)
                  );
                  return (
                    <li>
                      <Link
                        href={`/${entry.token.accountID}/${workspace()?.id}`}
                      >
                        {" "}
                        Workspace: {workspace()?.id}
                      </Link>
                    </li>
                  );
                }}
              </For>
            </ol>
          </ol>
        );
      }}
    </For>
  );
}

// App
// -> look for any login tokens
// -> redirect to default
// -> if none found, redirect to login
// Workspace
// -> make sure the login token exists + works
// -> otherwise redirect to login
