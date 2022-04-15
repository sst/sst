import { useState } from "react";
import "./App.css";

export default function App() {
  const [count, setCount] = useState(null);

  function onClick() {
    fetch(process.env.REACT_APP_API_URL, {
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
