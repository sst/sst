import logo from "./logo.svg";
import "./App.css";

function App() {
  console.log("API_URL is:", process.env.REACT_APP_API_URL);
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>API_URL is: {process.env.REACT_APP_API_URL}</p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
