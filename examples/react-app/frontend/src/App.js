import { useState } from "react";
import "./App.css";

export default function App() {
  const [count, setCount] = useState(null);

  function onClick() {
    fetch("https://51q98mf39e.execute-api.us-east-1.amazonaws.com", {
      method: "POST",
    })
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
