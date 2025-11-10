
//  Main entry point for SigmaGPT frontend
// Handles:
//  Global chat context (MyContext)
//  Authentication state integration
//  Thread, prompt, reply, and chat management


import React, { useEffect, useState } from "react";
import "./App.css";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import { MyContext } from "./MyContext.jsx";
import { v1 as uuidv1 } from "uuid";
import { useAuth } from "./context/AuthContext.jsx";


//  FlashMessage Component

// Displays short success or info messages (e.g. "Login successful")
// Appears at the top of the app, automatically disappears.

function FlashMessage() {
  const { flashMessage } = useAuth(); // Access flash message from AuthContext
  if (!flashMessage) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#4CAF50",
        color: "white",
        padding: "10px 20px",
        borderRadius: "8px",
        zIndex: 1000,
        boxShadow: "0px 2px 6px rgba(0,0,0,0.2)",
        fontWeight: "bold",
      }}
    >
      {flashMessage}
    </div>
  );
}


// Main App Component

// Manages all top-level states (prompt, reply, chat history, etc.)
// Provides them through MyContext to Sidebar & ChatWindow components

function App() {
  //  Chat-related states
  const [prompt, setPrompt] = useState(""); // user input text
  const [reply, setReply] = useState(null); // AI response
  const [currThreadId, setCurrThreadId] = useState(uuidv1()); // unique thread ID
  const [prevChats, setPrevChats] = useState([]); // chat history in current thread
  const [newChat, setNewChat] = useState(true); // flag for new conversation
  const [allThreads, setAllThreads] = useState([]); // list of all user threads
  const [refreshThreads, setRefreshThreads] = useState(null); // used to refresh sidebar threads

  //  Get user data from authentication context
  const { user } = useAuth();

  
  //  Reset all chat data when user logs out
 
  // Ensures that a new user starts with a fresh chat session
  
  useEffect(() => {
    if (!user) {
      setAllThreads([]);
      setPrevChats([]);
      setNewChat(true);
      setReply(null);
      setPrompt("");
      setCurrThreadId(uuidv1());
    }
  }, [user]);

  
  //  Context Provider Values
  
  // All these variables are shared across child components
  // like Sidebar and ChatWindow using MyContext
  
  const providerValues = {
    prompt,
    setPrompt,
    reply,
    setReply,
    currThreadId,
    setCurrThreadId,
    newChat,
    setNewChat,
    prevChats,
    setPrevChats,
    allThreads,
    setAllThreads,
    refreshThreads,
    setRefreshThreads,
  };

  
  //  Render Layout
 
  //  FlashMessage (top notifications)
  //  Sidebar (chat history & navigation)
  //  ChatWindow (main chat interface)
  
  return (
    <div className="app">
      <FlashMessage />
      <MyContext.Provider value={providerValues}>
        <Sidebar />
        <ChatWindow />
      </MyContext.Provider>
    </div>
  );
}

export default App;
