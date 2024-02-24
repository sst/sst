import { useState } from "react";
import { Auth } from "aws-amplify";

export default function Login({ setScreen, setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="login">
      <input
        type="email"
        placeholder="email"
        autoComplete="off"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={() => {
          Auth.signIn(email, password)
            .then((user) => setUser(user))
            .catch((e) => alert(e));
        }}
      >
        Login
      </button>
      <span onClick={() => setScreen("signup")}>
        Don't have an account? Sign up
      </span>
    </div>
  );
}
