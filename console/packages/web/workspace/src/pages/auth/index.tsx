import { Route, Routes, Navigate } from "@solidjs/router";
import { useReplicache } from "../../data/replicache";

export function Auth() {
  return (
    <Routes>
      <Route path="" component={Provider} />
      <Route path="workspaces" component={Workspaces} />
    </Routes>
  );
}

function Provider() {
  const params = {
    client_id: "solid",
    redirect_uri: location.origin + "/auth/workspaces",
    response_type: "token",
  };

  return (
    <ol>
      <li>
        <a
          href={
            import.meta.env.VITE_AUTH_URL +
            "/authorize?" +
            new URLSearchParams({
              ...params,
              provider: "github",
            }).toString()
          }
        >
          Github
        </a>
      </li>
    </ol>
  );
}

function Workspaces() {
  const params = new URLSearchParams(location.hash.slice(1));
  const replicache = useReplicache();
  const access_token = params.get("access_token");
  if (!access_token) return <Navigate href="/auth" />;
  replicache.auth = access_token;
  location.hash = "";
  replicache.pull();

  return <h1>Workspaces</h1>;
}
