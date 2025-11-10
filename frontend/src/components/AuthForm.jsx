

// Reusable authentication form component
// Handles both Login and Register functionality


import { useState } from "react";
import { useAuth } from "../context/AuthContext";

function AuthForm({ mode, onClose }) {
  //  Access login() from global AuthContext
  const { login } = useAuth();

  //  Local state for form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

 
  //  Handle form submission for login/register
  
  // 1️ Detect mode ("login" or "register")
  // 2️ Send POST request to backend
  // 3️ Update context with user data if successful
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      //  Choose correct API endpoint based on mode
      const url =
        mode === "register" ? "/api/auth/register" : "/api/auth/login";

      //  Request body
      const body =
        mode === "register"
          ? { name, email, password }
          : { email, password };

      //  Send API request
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", //  Allow cookies (token storage)
        body: JSON.stringify(body),
      });

      //  Handle invalid response
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Authentication failed!");
      }

      //  Parse response and update AuthContext
      const data = await res.json();
      const userData = data.user || data;

      //  Backend already sets cookies — just store user info in context
      login(userData);

      //  Close modal after successful auth
      onClose();
    } catch (err) {
      console.error("Auth error:", err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  
  //  UI Rendering
  
  // Shows input fields for name, email, password
  // and dynamic submit button (Login/Register)
  
  return (
    <form onSubmit={handleSubmit}>
      {/*  Name field (only for register mode) */}
      {mode === "register" && (
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      )}

      {/*  Email field */}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      {/*  Password field */}
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {/*  Submit button */}
      <button type="submit" disabled={loading}>
        {loading
          ? mode === "register"
            ? "Registering..."
            : "Logging in..."
          : mode === "register"
          ? "Register"
          : "Login"}
      </button>
    </form>
  );
}

export default AuthForm;
