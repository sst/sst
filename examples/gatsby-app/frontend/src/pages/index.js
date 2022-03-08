import React, { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  function onClick() {
    fetch(process.env.GATSBY_APP_API_URL, {
      method: "POST",
    })
      .then((response) => response.text())
      .then(setCount);
  }

  return (
    <div style={{ display: "grid", height: "100vh", placeItems: "center" }}>
      <div>
        <p>You clicked me {count} times.</p>
        <button style={{ fontSize: 48 }} onClick={onClick}>
          Click Me!
        </button>
      </div>
    </div>
  );
}
