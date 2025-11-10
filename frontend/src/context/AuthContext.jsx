
//  Purpose:
// Centralized authentication logic for the entire SigmaGPT app.
// It manages user login, logout, and session persistence using
// cookies (for secure backend auth) and localStorage (for fallback).


import { createContext, useContext, useState, useEffect } from "react";

//  Create a React Context to share authentication state globally.
const AuthContext = createContext();

const AuthProvider = ({ children, navigate }) => {
  
  //  State Management
  
  // user    stores logged-in user info (name, email, role)
  // flashMessage   small notification message (like Login successful)
  // loading        indicates whether app is verifying login status
  
  const [user, setUser] = useState(null);
  const [flashMessage, setFlashMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  
  // Auto Login Logic (runs when app first loads)
  
  // Step 1 Try to verify user using /api/auth/me (cookie-based)
  // Step 2️ If unauthorized, wait 500ms and retry (fix for slow cookie sync)
  // Step 3️ If still unauthorized, call /api/auth/refresh to renew tokens
  // Step 4️ If all fails, fallback to user info stored in localStorage
  
  useEffect(() => {
    const checkUserSession = async (isRetry = false) => {
      try {
        //  Try to get user info using backend cookie authentication
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include", // send cookies with request
          headers: { Accept: "application/json" },
        });

        //  Successful response → store user in state and localStorage
        if (res.ok) {
          const data = await res.json();
          const userData = data.user || data;
          setUser(userData);
          localStorage.setItem("user", JSON.stringify(userData));
          setLoading(false);
          return;
        }

        //  Case: token just expired or cookie not yet attached
        // Retry once after a small delay
        if (res.status === 401 && !isRetry) {
          console.warn("401 on /me, retrying in 500ms...");
          setTimeout(() => checkUserSession(true), 500);
          return;
        }

        //  Case: still unauthorized → refresh token flow
        if (res.status === 401 && isRetry) {
          console.warn("Retry failed, attempting refresh...");
          const refreshRes = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include", // sends refresh token cookie
          });

          //  If refresh worked, store new user data
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const refreshedUser = refreshData.user || refreshData;
            setUser(refreshedUser);
            localStorage.setItem("user", JSON.stringify(refreshedUser));
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error("Auto-login check failed:", err);
      }

      //  Fallback: use last known user from localStorage
      const savedUser = localStorage.getItem("user");
      if (savedUser) setUser(JSON.parse(savedUser));

      setLoading(false);
    };

    checkUserSession();
  }, []);

  
  //  Login Function
  
  // Called after successful API response in AuthForm.jsx
  // 1️ Stores user info in state + localStorage
  // 2️ Shows a short success message (3 sec)
  
  const login = (userData) => {
    const parsed = userData.user || userData;
    setUser(parsed);
    localStorage.setItem("user", JSON.stringify(parsed));
    setFlashMessage("✅ Login successful!");
    setTimeout(() => setFlashMessage(null), 3000);
  };

  
  //  Logout Function
  // ------------------------------------------------------
  // 1️ Calls backend logout API (clears cookies)
  // 2️ Clears user from state + localStorage
  // 3️ Shows a logout confirmation message
  // 4️ Optionally redirects user (if navigate prop is passed)
  
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // remove cookies from backend
      });
    } catch (err) {
      console.error("Logout error:", err.message);
    }

    // Clear user info both locally and globally
    setUser(null);
    localStorage.removeItem("user");

    // Temporary success message
    setFlashMessage(" You have been logged out successfully!");
    setTimeout(() => setFlashMessage(null), 3000);

    // Optional redirect (used in protected routes)
    if (navigate) navigate("/chat");
  };

  
  //  Provide Context Globally
  
  // Makes all auth-related data & functions accessible
  // from anywhere inside the app via useAuth()
  
  return (
    <AuthContext.Provider
      value={{ user, login, logout, flashMessage, setUser, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};


//  useAuth() Hook

// Simplifies access to the AuthContext
// Example: const { user, logout } = useAuth();

export const useAuth = () => useContext(AuthContext);

export default AuthProvider;
