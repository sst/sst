import { useState } from "react";
import { Auth } from "aws-amplify";

export default function Signup({ setScreen }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  return (
    <div className="signup">
      <input
        type="email"
        placeholder="email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="password"
        onChange={(e) => setPassword(e.target.value)}
      />
      {verifying && (
        <input
          type="text"
          placeholder="code"
          onChange={(e) => setCode(e.target.value)}
        />
      )}
      <button
        onClick={() => {
          if (verifying) {
            Auth.confirmSignUp(email, code).then(() => {
              setScreen("login");
            });
          } else {
            Auth.signUp({
              username: email,
              password,
            })
              .then(() => {
                setVerifying(true);
              })
              .catch((e) => alert(e));
          }
        }}
      >
        {verifying ? "Verify" : "Sign up"}
      </button>
      <span onClick={() => setScreen("login")}>
        Already have an account? Login
      </span>
    </div>
  );
}
