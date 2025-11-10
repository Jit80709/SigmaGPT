
//  SigmaGPT — Final Stable Voice + Chat + Upgrade Modal Version
// Includes:
//   Voice recording using Web APIs
//   Text-based chat integrated with backend
//  Theme toggle (Dark/Light)
//   Auth Modals + Upgrade popup
//  Toast notifications + Custom confirmation modal


import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState, useEffect, useRef } from "react";
import { ScaleLoader } from "react-spinners";
import { useAuth } from "./context/AuthContext.jsx";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AuthForm from "./components/AuthForm.jsx";
import { v1 as uuidv1 } from "uuid";

function ChatWindow() {
  
  //  CONTEXT & STATE MANAGEMENT
  // Accessing global chat variables using MyContext
  
  const {
    prompt, setPrompt,
    reply, setReply,
    currThreadId, setCurrThreadId,
    setPrevChats, setNewChat,
    setAllThreads, theme, setTheme,
    refreshThreads
  } = useContext(MyContext);

  const { user, logout } = useAuth();

  // Local state management
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Modal states
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Refs for recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  
  //  VOICE RECORDING SYSTEM
  // Uses Web MediaRecorder API to record user's voice,
  // send it to backend, and get the AI-generated response.
  
  const startRecording = async () => {
    if (!user) {
      toast.warn(" Please login before using the microphone!");
      return;
    }

    try {
      // Ask browser for microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setReply(" Listening...");
      audioChunksRef.current = [];

      // Collect audio data chunks
      mediaRecorderRef.current.addEventListener("dataavailable", (e) => {
        audioChunksRef.current.push(e.data);
      });

      // When recording stops
      mediaRecorderRef.current.addEventListener("stop", async () => {
        setReply(" Processing your voice...");
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", audioBlob, "voice.webm");

        try {
          // Send audio to backend for transcription & AI response
          const response = await fetch("http://localhost:8080/api/voice", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
          const data = await response.json();

          if (!data.text) {
            setReply(" Sorry, I couldn’t understand your voice. Please try again.");
            return;
          }

          const detectedLang = data.language || "en";
          console.log(" Frontend Detected Language:", detectedLang);

          // Save user voice input and AI reply to chat window
          if (data.userText)
            setPrevChats((prev) => [...prev, { role: "user", content: data.userText }]);

          setPrevChats((prev) => [...prev, { role: "assistant", content: data.text }]);
          setReply(data.text);

          // Also save this message to backend thread
          await fetch("/api/chat", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: data.userText || "Voice Input",
              threadId: currThreadId,
            }),
          });

          if (typeof refreshThreads === "function") refreshThreads();

          // Play audio response from backend (if available)
          if (data.audioUrl) {
            const audio = new Audio(data.audioUrl);
            audio.play();
          }

        } catch (err) {
          console.error(" Voice fetch error:", err);
          setReply(" There was an error processing your voice. Please try again.");
        }
      });

      // Auto stop after 5 seconds
      setTimeout(() => stopRecording(), 5000);
    } catch (err) {
      console.error(" Microphone error:", err);
      toast.error(" Please allow microphone access to use this feature.");
    }
  };

  // Stop voice recording manually
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setTimeout(() => setIsRecording(false), 300);
  };

  
  //  THEME HANDLING (Dark / Light)
  
  useEffect(() => {
    const saved = localStorage.getItem("sigmaTheme");
    if (saved === "light") {
      document.body.classList.remove("dark-mode");
      setTheme?.("light");
    } else {
      document.body.classList.add("dark-mode");
      setTheme?.("dark");
      localStorage.setItem("sigmaTheme", "dark");
    }
  }, []);

  // Toggle between light & dark modes
  const toggleTheme = () => {
    const isDark = document.body.classList.contains("dark-mode");
    if (isDark) {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("sigmaTheme", "light");
      setTheme?.("light");
    } else {
      document.body.classList.add("dark-mode");
      localStorage.setItem("sigmaTheme", "dark");
      setTheme?.("dark");
    }
  };

  // =====================================================
  //  FETCH THREADS (Chat history list for sidebar)
  
  useEffect(() => {
    const fetchThreads = async () => {
      if (!user) {
        setPrevChats([]);
        return;
      }

      try {
        let res = await fetch("/api/thread", {
          method: "GET",
          credentials: "include",
        });

        // Auto-refresh token if expired
        if (res.status === 401) {
          const refresh = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include",
          });
          if (refresh.ok) {
            res = await fetch("/api/thread", { method: "GET", credentials: "include" });
          } else {
            logout();
            return;
          }
        }

        const data = await res.json();
        if (Array.isArray(data)) {
          setAllThreads(data.map((t) => ({ threadId: t.threadId, title: t.title })));
        }
      } catch (err) {
        console.warn("Thread fetch error:", err);
        setPrevChats([]);
      }
    };

    fetchThreads();
  }, [user]);

 
  //  TEXT CHAT FUNCTIONALITY (User → AI)
  
  const getReply = async () => {
    if (!user) {
      toast.warn(" Please login first!");
      return;
    }
    if (!prompt.trim()) return;

    // Add user question to chat UI
    setPrevChats((prev) => [...prev, { role: "user", content: prompt }]);
    const userPrompt = prompt;
    setPrompt("");
    setLoading(true);
    setNewChat(false);

    try {
      // Send text message to backend
      let response = await fetch("/api/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userPrompt, threadId: currThreadId }),
      });

      // Refresh token if expired
      if (response.status === 401) {
        const refresh = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (refresh.ok) {
          response = await fetch("/api/chat", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userPrompt, threadId: currThreadId }),
          });
        } else {
          logout();
          setLoading(false);
          return;
        }
      }

      // Append AI reply
      const res = await response.json();
      setPrevChats((prev) => [...prev, { role: "assistant", content: res.reply }]);
      setReply(res.reply);
      if (typeof refreshThreads === "function") refreshThreads();
    } catch (err) {
      console.error("Chat error:", err);
    }

    setLoading(false);
  };

  
  //  CLEAR CHAT HISTORY (Custom Confirmation Modal)
  
  const handleClearHistory = () => {
    if (!user) {
      toast.warn(" Please login first!");
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmClearChats = async () => {
    try {
      setIsClearing(true);
      const response = await fetch("/api/thread/clear", {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Failed to clear chats");

      // Reset UI after clearing
      setPrevChats([]);
      setAllThreads([]);
      setNewChat(true);
      setReply(null);
      setPrompt("");
      setCurrThreadId(uuidv1());
      if (typeof refreshThreads === "function") refreshThreads();

      toast.success(" All chat history cleared successfully!");
    } catch (err) {
      console.error(" Error clearing chat history:", err);
      toast.error(" Failed to clear chat history!");
    } finally {
      setIsClearing(false);
      setShowConfirmModal(false);
    }
  };

  // =====================================================
  // ⚙️ MODALS (Settings & Upgrade)
  // =====================================================
  const SettingsModal = () => (
    <div className="modal">
      <div className="modal-content">
        <h3>Settings ⚙️</h3>
        {user ? (
          <>
            <p>Name: {user?.name}</p>
            <p>Email: {user?.email}</p>
          </>
        ) : (
          <p>Please login to view your profile.</p>
        )}
        <button onClick={toggleTheme}>
          {document.body.classList.contains("dark-mode") ? "Switch to Light Mode " : "Switch to Dark Mode "}
        </button>
        <button onClick={() => setShowSettings(false)}>Close</button>
      </div>
    </div>
  );

  const UpgradeModal = () => (
    <div className="modal">
      <div className="modal-content">
        <h3>💎 Upgrade Plan</h3>
        <p><strong>Free:</strong> Limited usage.</p>
        <p><strong>Pro:</strong> Unlimited, faster responses.</p>
        <button onClick={() => toast.info(" Upgrade feature not implemented.")}>Upgrade to Pro</button>
        <button onClick={() => setShowUpgrade(false)}>Close</button>
      </div>
    </div>
  );

  
  //  UI LAYOUT
  
  return (
    <div className="chatWindow">
      {/* 🔹 Navbar Section */}
      <div className="navbar">
        <span>SigmaGPT <i className="fa-solid fa-chevron-down"></i></span>
        <div className="userIconDiv" onClick={() => setIsOpen(!isOpen)}>
          <span className="userIcon"><i className="fa-solid fa-user"></i></span>
        </div>
      </div>

      {/*  Dropdown Menu */}
      {isOpen && (
        <div className="dropDown">
          {user ? (
            <>
              <div className="dropDownItem"> {user?.name}</div>
              <div className="dropDownItem" onClick={() => { setShowSettings(true); setIsOpen(false); }}>
                <i className="fa-solid fa-gear" /> Settings
              </div>
              <div className="dropDownItem" onClick={() => { setShowUpgrade(true); setIsOpen(false); }}>
                <i className="fa-solid fa-gem" /> Upgrade Plan
              </div>
              <div className="dropDownItem" onClick={() => { handleClearHistory(); setIsOpen(false); }}>
                <i className="fa-solid fa-trash" /> Clear Chat
              </div>
              <div className="dropDownItem" onClick={() => { logout(); setIsOpen(false); }}>
                <i className="fa-solid fa-arrow-right-from-bracket" /> Logout
              </div>
            </>
          ) : (
            <>
              <div className="dropDownItem" onClick={() => setShowLogin(true)}>
                <i className="fa-solid fa-right-to-bracket" /> Sign In
              </div>
              <div className="dropDownItem" onClick={() => setShowRegister(true)}>
                <i className="fa-solid fa-user-plus" /> Register
              </div>
            </>
          )}
        </div>
      )}

      {/* 🔹 Chat Messages */}
      <Chat />

      {/*  Loader (while AI is replying) */}
      {loading && (
        <div className="loader">
          <ScaleLoader 
            color={theme === "dark" ? "#ffffff" : "#000000"} 
            loading={loading} 
            height={18} 
            width={4} 
          />
        </div>
      )}

      {/*  Chat Input + Mic */}
      <div className="chatInput">
        <div className="inputBox">
          <input
            placeholder={user ? "Ask or speak..." : "Login to start chatting..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? getReply() : null)}
            disabled={!user}
          />
          <div
            id="mic"
            onClick={() => (isRecording ? stopRecording() : startRecording())}
            style={{ opacity: user ? 1 : 0.4, cursor: user ? "pointer" : "not-allowed" }}
          >
            <i className={`fa-solid ${isRecording ? "fa-microphone" : "fa-microphone-slash"}`} style={{
              color: isRecording ? "red" : "white",
              transition: "0.3s",
              transform: isRecording ? "scale(1.2)" : "scale(1)",
            }}></i>
          </div>
          <div id="submit" onClick={getReply} style={{ opacity: user ? 1 : 0.4 }}>
            <i className="fa-solid fa-paper-plane"></i>
          </div>
        </div>
        {isRecording && <p className="info"> SigmaGPT is listening...</p>}
        <p className="info">SigmaGPT can make mistakes. Check important info. See Cookie Preferences.</p>
      </div>

      {/*  Modals Section */}
      {showSettings && <SettingsModal />}
      {showUpgrade && <UpgradeModal />}

      {/* Login/Register Popup */}
      {showLogin && (
        <div className="modal">
          <div className="modal-content">
            <h3>Sign In</h3>
            <AuthForm mode="login" onClose={() => setShowLogin(false)} />
          </div>
        </div>
      )}
      {showRegister && (
        <div className="modal">
          <div className="modal-content">
            <h3>Register</h3>
            <AuthForm mode="register" onClose={() => setShowRegister(false)} />
          </div>
        </div>
      )}

      {/*  Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h3> Clear Chat History?</h3>
            <p>This will permanently delete all chats.</p>
            <div className="modal-buttons">
              <button className="confirm-btn" onClick={confirmClearChats} disabled={isClearing}>
                {isClearing ? "Clearing..." : "Yes, Clear"}
              </button>
              <button className="cancel-btn" onClick={() => setShowConfirmModal(false)} disabled={isClearing}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/*  Toast Container (Notifications) */}
      <ToastContainer position="bottom-right" autoClose={3000} theme={theme === "dark" ? "dark" : "light"} />
    </div>
  );
}

export default ChatWindow;
