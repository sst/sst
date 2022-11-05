import { useEffect, useState } from "react";

const App = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const getSession = async () => {
    const token = localStorage.getItem("session");
    if (token) {
      const user = await getUserInfo(token);
      if (user) setSession(user);
    }
    setLoading(false);
  };
  
  useEffect(() => {
    getSession();
  }, []);

  useEffect(() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("session", token);
      window.location.replace(window.location.origin);
    }
  }, []);

  const getUserInfo = async (session) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APP_API_URL}/session`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session}`,
          },
        }
      );
      return response.json();
    } catch (error) {
      alert(error);
    }
  };

  const signOut = async () => {
    localStorage.clear("session");
    setSession(null);
  };

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h2>SST Auth Example</h2>
      {session ? (
      <div className="profile">
        <p>Welcome {session.name}!</p>
        <img
          src={session.picture}
          style={{ borderRadius: "50%" }}
          width={100}
          height={100}
          alt=""
        />
        <p>{session.email}</p>
        <button onClick={signOut}>Sign out</button>
      </div>
      ) : (
        <div>
          <a
            href={`${import.meta.env.VITE_APP_API_URL}/auth/facebook/authorize`}
            rel="noreferrer"
          >
            <button>Sign in with Facebook</button>
          </a>
        </div>
      )}
    </div>
  );
};

export default App;