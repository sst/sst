import { API } from "aws-amplify";
import React from "react";
import { useAuth0 } from "@auth0/auth0-react";

const App = () => {
  const {
    loginWithRedirect,
    logout,
    user,
    isAuthenticated,
    isLoading,
    getAccessTokenSilently,
  } = useAuth0();

  const publicRequest = async () => {
    const response = await API.get("api", "/public");
    alert(JSON.stringify(response));
  };

  const privateRequest = async () => {
    try {
      const accessToken = await getAccessTokenSilently({
        audience: `https://${import.meta.env.VITE_APP_AUTH0_DOMAIN}/api/v2/`,
        scope: "read:current_user",
      });
      const response = await API.get("api", "/private", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      alert(JSON.stringify(response));
    } catch (error) {
      alert(error);
    }
  };

  if (isLoading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h2>SST + Auth0 + React</h2>
      {isAuthenticated ? (
        <div className="profile">
          <p>Welcome!</p>
          <p>{user.email}</p>
          <button onClick={logout}>logout</button>
        </div>
      ) : (
        <div>
          <p>Not signed in</p>
          <button onClick={loginWithRedirect}>login</button>
        </div>
      )}
      <div className="api-section">
        <button onClick={publicRequest}>call /public</button>
        <button onClick={privateRequest}>call /private</button>
      </div>
    </div>
  );
};

export default App;
