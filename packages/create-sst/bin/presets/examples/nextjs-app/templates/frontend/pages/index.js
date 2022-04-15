import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(null);

  function onClick() {
    fetch("/api/count", { method: "POST" })
      .then((response) => response.text())
      .then(setCount);
  }

  return (
    <div className="App">
      {count && <p>You clicked me {count} times.</p>}
      <button onClick={onClick}>Click Me!</button>
    </div>
  );
}
