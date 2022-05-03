import { Auth, API } from "aws-amplify";
import React, { useState, useEffect } from "react";

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getUser = async () => {
    const user = await Auth.currentUserInfo();
    if (user) setUser(user);
    setLoading(false);
  };

  const signIn = async () =>
    await Auth.federatedSignIn({
      provider: "Google",
    });

  const signOut = async () => await Auth.signOut();

  const publicRequest = async () => {
    const response = await API.get("api", "/public");
    alert(JSON.stringify(response));
  };

  const privateRequest = async () => {
    try {
      const response = await API.get("api", "/private", {
        headers: {
          Authorization: `Bearer ${(await Auth.currentSession())
            .getAccessToken()
            .getJwtToken()}`,
        },
      });
      alert(JSON.stringify(response));
    } catch (error) {
      alert(error);
    }
  };

  useEffect(() => {
    getUser();
  }, []);

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h2>SST + Cognito + Google OAuth + React</h2>
      {user ? (
        <div className="profile">
          <p>Welcome {user.attributes.given_name}!</p>
          <img
            src={user.attributes.picture}
            style={{ borderRadius: "50%" }}
            width={100}
            height={100}
            alt=""
          />
          <p>{user.attributes.email}</p>
          <button onClick={signOut}>logout</button>
        </div>
      ) : (
        <div>
          <p>Not signed in</p>
          <button onClick={signIn}>login</button>
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
