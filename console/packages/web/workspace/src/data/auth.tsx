import { Navigate } from "@solidjs/router";
import { Replicache } from "replicache";
import { ParentProps, createContext, useContext } from "solid-js";

export * as AuthStore from "./auth";

interface AuthData {
  [accountID: string]: Token;
}

interface Token {
  email: string;
  accountID: string;
  token: string;
}

function get() {
  return JSON.parse(localStorage.getItem("auth") || "{}") as AuthData;
}

function set(auth: AuthData) {
  return localStorage.setItem("auth", JSON.stringify(auth));
}

function login() {
  const params = new URLSearchParams({
    client_id: "solid",
    redirect_uri: location.origin + "/",
    response_type: "token",
    provider: "github",
  });
  const url = import.meta.env.VITE_AUTH_URL + "/authorize?" + params.toString();
  return url;
}

type AuthContextType = Record<
  string,
  {
    token: Token;
    replicache: Replicache;
  }
>;
const AuthContext = createContext<AuthContextType>();

export function AuthProvider(props: ParentProps) {
  const tokens = get();
  const fragment = new URLSearchParams(location.hash.substring(1));
  const access_token = fragment.get("access_token");
  if (access_token) {
    const [_headerEncoded, payloadEncoded] = access_token.split(".");
    const payload = JSON.parse(
      atob(payloadEncoded.replace(/-/g, "+").replace(/_/g, "/"))
    );
    tokens[payload.properties.accountID] = {
      token: access_token,
      ...payload.properties,
    };
    set(tokens);
  }

  console.log("Auth Info", tokens);

  if (Object.values(tokens).length === 0) {
    location.href = login();
    return;
  }

  const stores: AuthContextType = {};
  for (const token of Object.values(tokens)) {
    stores[token.accountID] = {
      token,
      replicache: new Replicache({
        name: token.accountID,
        auth: `Bearer ${token.token}`,
        licenseKey: "l24ea5a24b71247c1b2bb78fa2bca2336",
        pullURL: import.meta.env.VITE_API_URL + "/replicache/pull",
        pushURL: import.meta.env.VITE_API_URL + "/replicache/push",
      }),
    };
  }

  return (
    <AuthContext.Provider value={stores}>{props.children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const result = useContext(AuthContext);
  if (!result) throw new Error("useAuth must be used within a AuthProvider");
  return result;
}
