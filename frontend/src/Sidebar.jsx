

//  SigmaGPT Sidebar Component

// Handles:
//   Displaying previous chat threads
//  Switching between threads
//  Creating new chats
//  Deleting old threads
//  Auto-refresh (connected to ChatWindow)


import "./Sidebar.css";
import { useContext, useEffect } from "react";
import { MyContext } from "./MyContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { v1 as uuidv1 } from "uuid";

function Sidebar() {
  //  Access global chat context variables
  const {
    allThreads,
    setAllThreads,
    currThreadId,
    setNewChat,
    setPrompt,
    setReply,
    setCurrThreadId,
    setPrevChats,
    setRefreshThreads //  function injected for sidebar auto-refresh
  } = useContext(MyContext);

  //  Authentication context
  const { user, logout } = useAuth();

  
  //  FETCH ALL CHAT THREADS (with refresh-token handling)
  
  const getAllThreads = async () => {
    if (!user) {
      setAllThreads([]);
      handleNewChat();
      return;
    }

    try {
      let response = await fetch("/api/thread", {
        method: "GET",
        credentials: "include", // include cookies
      });

      // If token expired → try refreshing
      if (response.status === 401) {
        console.warn("401 on fetching threads — trying refresh...");
        const refresh = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });

        if (refresh.ok) {
          response = await fetch("/api/thread", {
            method: "GET",
            credentials: "include",
          });
        } else {
          console.warn("Refresh failed, logging out.");
          logout();
          setAllThreads([]);
          handleNewChat();
          return;
        }
      }

      if (!response.ok) throw new Error("Failed to fetch threads");

      const res = await response.json();
      // Save thread IDs & titles globally
      setAllThreads(res.map((t) => ({ threadId: t.threadId, title: t.title })));
    } catch (err) {
      console.error("Thread fetch error:", err);
    }
  };

  
  //  Run once on mount or user change
  
  useEffect(() => {
    getAllThreads();

    //  Expose this fetcher to ChatWindow for auto-refreshing
    setRefreshThreads(() => getAllThreads);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  
  //  NEW CHAT CREATION (Reset chat window)
  
  const handleNewChat = () => {
    setNewChat(true);
    setPrompt("");
    setReply(null);
    setCurrThreadId(uuidv1()); // unique ID per new thread
    setPrevChats([]);
  };

  
  //  SWITCH THREADS (Change conversation view)
  
  const changeThread = async (newThreadId) => {
    if (!user) return;

    setCurrThreadId(newThreadId);

    try {
      let response = await fetch(`/api/thread/${newThreadId}`, {
        method: "GET",
        credentials: "include",
      });

      // Token expired? Try refresh
      if (response.status === 401) {
        console.warn("401 while fetching thread messages — trying refresh...");
        const refresh = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });

        if (refresh.ok) {
          response = await fetch(`/api/thread/${newThreadId}`, {
            method: "GET",
            credentials: "include",
          });
        } else {
          logout();
          setPrevChats([]);
          setAllThreads([]);
          handleNewChat();
          return;
        }
      }

      if (!response.ok) throw new Error("Failed to fetch thread messages");

      const res = await response.json();

      // Update chat context with messages
      setPrevChats(res);
      setNewChat(false);
      setReply(null);
    } catch (err) {
      console.error("Change thread error:", err);
    }
  };

  
  //  DELETE THREAD (with token refresh handling)
  
  const deleteThread = async (threadId) => {
    if (!user) return;

    try {
      let response = await fetch(`/api/thread/${threadId}`, {
        method: "DELETE",
        credentials: "include",
      });

      // Token expired? Try refresh
      if (response.status === 401) {
        console.warn("401 while deleting thread — trying refresh...");
        const refresh = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });

        if (refresh.ok) {
          response = await fetch(`/api/thread/${threadId}`, {
            method: "DELETE",
            credentials: "include",
          });
        } else {
          logout();
          setAllThreads([]);
          handleNewChat();
          return;
        }
      }

      if (!response.ok) throw new Error("Failed to delete thread");

      // Update sidebar after deletion
      setAllThreads((prev) => prev.filter((thread) => thread.threadId !== threadId));

      // If current thread was deleted, start a new chat
      if (threadId === currThreadId) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Delete thread error:", err);
    }
  };

  
  //  RENDER SIDEBAR UI
  
  return (
    <section className="sidebar" aria-label="Sidebar">
      {/*  New Chat Button */}
      <button type="button" onClick={handleNewChat}>
        <img src="src/assets/blacklogo.png" alt="gpt logo" className="logo" />
        <h3 style={{ margin: 0 }}>New Chat</h3>
        <span>
          <i className="fa-solid fa-pen-to-square" />
        </span>
      </button>

      {/*  Chat Threads List */}
      <ul className="history" aria-label="Conversation history">
        {allThreads?.length > 0 ? (
          allThreads.map((thread) => (
            <li
              key={thread.threadId}
              onClick={() => changeThread(thread.threadId)}
              className={thread.threadId === currThreadId ? "highlighted" : ""}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") changeThread(thread.threadId);
                if (e.key === "Delete") {
                  e.stopPropagation();
                  deleteThread(thread.threadId);
                }
              }}
              title={thread.title || "Conversation"}
              aria-current={thread.threadId === currThreadId ? "true" : "false"}
            >
              {/* Thread Title */}
              <span
                style={{
                  display: "inline-block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "75%",
                }}
              >
                {thread.title || "Untitled"}
              </span>

              {/*  Delete Button */}
              <i
                className="fa-solid fa-trash"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteThread(thread.threadId);
                }}
                title="Delete thread"
                role="button"
                aria-label={`Delete thread ${thread.title || ""}`}
              />
            </li>
          ))
        ) : (
          // Empty state
          <li style={{ padding: "8px 12px", color: "rgba(255,255,255,0.6)" }}>
            No chats yet
          </li>
        )}
      </ul>

      {/*  Footer */}
      <div className="sign" aria-hidden="true">
        <p style={{ margin: 0 }}>By SigmaGPT ♥</p>
      </div>
    </section>
  );
}

export default Sidebar;
