import React, { useState, useEffect } from "react";
import { API } from "aws-amplify";
import "./Home.css";

export default function Home({ isAuthenticated }) {
  const [publicMessage, setPublic] = useState(null);
  const [privateMessage, setPrivate] = useState(null);

  useEffect(() => {
    // Load our public and private API
    async function onLoad() {
      try {
        const response = await loadPublic();
        setPublic(response.message);
      } catch (e) {
        setPublic(false);
      }
      try {
        const response = await loadPrivate();
        setPrivate(response.message);
      } catch (e) {
        setPrivate(false);
      }
    }

    onLoad();
  }, [isAuthenticated]);

  function loadPublic() {
    return API.get("random-api", "/public");
  }

  function loadPrivate() {
    return API.get("random-api", "/private");
  }

  return (
    <div className="Home">
      <h3>{publicMessage}</h3>
      <h3>
        {privateMessage === false
          ? "Cannot load private message"
          : privateMessage}
      </h3>
    </div>
  );
}
