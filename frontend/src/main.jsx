
//  SigmaGPT — Root Entry Point

// This file bootstraps the entire React app. It sets up:
//  Browser routing using React Router
// Global state using Context API (MyContext)
// Authentication wrapper (AuthProvider)
//  Global chat management (threads, messages, replies)


import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import AuthProvider from "./context/AuthContext.jsx";
import { MyContext } from "./MyContext.jsx";
import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";


//  RootWrapper Component

// Acts as the main container for:
//  Context provider (MyContext)
// Routing (React Router)
//  Authentication provider (AuthProvider)

function RootWrapper() {
  //  Global chat state (shared across components)
  const [prompt, setPrompt] = useState("");          // User input text
  const [reply, setReply] = useState(null);          // GPT reply
  const [currThreadId, setCurrThreadId] = useState(null); // Current chat thread ID
  const [prevChats, setPrevChats] = useState([]);    // Previous messages in chat
  const [newChat, setNewChat] = useState(true);      // Tracks if it's a fresh chat
  const [allThreads, setAllThreads] = useState([]);  // List of all threads (for sidebar)
  const [refreshThreads, setRefreshThreads] = useState(null); // Trigger thread refresh

  //  Combine all values into a single provider object
  const providerValues = {
    prompt,
    setPrompt,
    reply,
    setReply,
    currThreadId,
    setCurrThreadId,
    prevChats,
    setPrevChats,
    newChat,
    setNewChat,
    allThreads,
    setAllThreads,
    refreshThreads,
    setRefreshThreads,
  };

  
  // Routing Setup (BrowserRouter)
 
  //   Default homepage (Sidebar + ChatWindow)
  // chat  Optional direct chat route (same component)
  
  return (
    <BrowserRouter>
      <AuthProvider>
        <MyContext.Provider value={providerValues}>
          <Routes>
            {/*  Main Route — Full Chat UI */}
            <Route path="/" element={<App />} />
            {/*  Secondary Route (optional) */}
            <Route path="/chat" element={<App />} />
          </Routes>
        </MyContext.Provider>
      </AuthProvider>
    </BrowserRouter>
  );
}


//  Render the App into the DOM

// StrictMode helps detect potential issues during development.
// The RootWrapper wraps everything: Auth + Context + Routes.

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RootWrapper />
  </StrictMode>
);
