//  SigmaGPT — Final Voice + Chat Stable Version (Multilingual + Deploy Ready)

//  Features:
// - Text + Voice chat (Bengali, Hindi, English auto-detect)
// - Voice-to-Text (Whisper), AI Reply (GPT), Text-to-Speech (TTS)
// - Authenticated chat threads
// - Theme Switcher, Toast Alerts, Smooth UI
// - Fully deployable (localhost + Render compatible)


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
  //  Context values — shared across the app
  const {
    prompt, setPrompt,
    reply, setReply,
    currThreadId, setCurrThreadId,
    setPrevChats, setNewChat,
    setAllThreads, theme, setTheme,
    refreshThreads
  } = useContext(MyContext);

  const { user, logout } = useAuth(); //  User Authentication Context

  //  Local component states
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  //  Auto-detect backend URL (works both local + deployed)
  const BACKEND_URL =
    window.location.hostname === "localhost"
      ? "http://localhost:8080"
      : import.meta.env.VITE_BACKEND_URL;

  //  Voice Recording + AI Processing Flow

  const startRecording = async () => {
    if (!user) {
      toast.warn("Please login before using the microphone!");
      return;
    }

    try {
      //  Step 1: Request mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setReply("Listening...");
      audioChunksRef.current = [];

      //  Step 2: Store recorded audio chunks
      mediaRecorderRef.current.addEventListener("dataavailable", (e) => {
        audioChunksRef.current.push(e.data);
      });

      //  Step 3: When recording stops → send to backend for transcription + reply
      mediaRecorderRef.current.addEventListener("stop", async () => {
        setReply("Processing your voice...");
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", audioBlob, "voice.webm");

        try {
          // Send recorded voice to backend
          const response = await fetch(`${BACKEND_URL}/api/voice`, {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
          const data = await response.json();

          //  If AI couldn’t transcribe properly
          if (!data.text) {
            setReply("Sorry, I couldn’t understand your voice. Please try again.");
            return;
          }

          console.log(" Detected Language:", data.language || "en");

          //  Update UI chat messages
          if (data.userText)
            setPrevChats((prev) => [...prev, { role: "user", content: data.userText }]);

          setPrevChats((prev) => [...prev, { role: "assistant", content: data.text }]);
          setReply(data.text);

          //  Save chat to backend database
          await fetch(`${BACKEND_URL}/api/chat`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: data.userText || "Voice Input",
              threadId: currThreadId,
            }),
          });

          //  Refresh thread list in sidebar
          if (typeof refreshThreads === "function") refreshThreads();

          //  Play AI voice reply
          if (data.audioUrl) {
            const audio = new Audio(data.audioUrl);
            try {
              audio.pause();
              audio.currentTime = 0;
              await audio.play();
            } catch (err) {
              console.warn("Audio playback blocked:", err);
            }
          }
        } catch (err) {
          console.error("Voice fetch error:", err);
          setReply("There was an error processing your voice. Please try again.");
        }
      });

      //  Auto-stop after 6 seconds (user convenience)
      setTimeout(() => stopRecording(), 6000);
    } catch (err) {
      console.error("Microphone error:", err);
      toast.error("Please allow microphone access to use this feature.");
    }
  };

  //  Stop Voice Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setTimeout(() => setIsRecording(false), 300);
  };

  //  Theme Handler (Dark/Light)
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

  //  Fetch all previous chat threads from backend
  useEffect(() => {
    const fetchThreads = async () => {
      if (!user) {
        setPrevChats([]);
        return;
      }
      try {
        let res = await fetch(`${BACKEND_URL}/api/thread`, {
          method: "GET",
          credentials: "include",
        });

        //  Refresh token flow (auto-login recovery)
        if (res.status === 401) {
          const refresh = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
            method: "POST",
            credentials: "include",
          });
          if (refresh.ok) {
            res = await fetch(`${BACKEND_URL}/api/thread`, {
              method: "GET",
              credentials: "include",
            });
          } else {
            toast.warn(" Session expired. Please log in again.");
            logout();
            return;
          }
        }

        const data = await res.json();
        if (Array.isArray(data))
          setAllThreads(data.map((t) => ({ threadId: t.threadId, title: t.title })));
      } catch (err) {
        console.warn("Thread fetch error:", err);
        setPrevChats([]);
      }
    };

    fetchThreads();
  }, [user]);

  //  Text Chat Flow (AI conversation)
  const getReply = async () => {
    if (!user) {
      toast.warn("Please login first!");
      return;
    }
    if (!prompt.trim()) return;

    //  Add user message to UI instantly
    setPrevChats((prev) => [...prev, { role: "user", content: prompt }]);
    const userPrompt = prompt;
    setPrompt("");
    setLoading(true);
    setNewChat(false);

    try {
      // Send user query to backend
      let response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userPrompt, threadId: currThreadId }),
      });

      //  Refresh session if expired
      if (response.status === 401) {
        const refresh = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (refresh.ok) {
          response = await fetch(`${BACKEND_URL}/api/chat`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userPrompt, threadId: currThreadId }),
          });
        } else {
          toast.warn(" Session expired. Please log in again.");
          logout();
          setLoading(false);
          return;
        }
      }

      const res = await response.json();
      //  Display AI reply in chat window
      setPrevChats((prev) => [...prev, { role: "assistant", content: res.reply }]);
      setReply(res.reply);
      if (typeof refreshThreads === "function") refreshThreads();
    } catch (err) {
      console.error("Chat error:", err);
    }

    setLoading(false);
  };

  // Chat History Management
  const handleClearHistory = () => {
    if (!user) {
      toast.warn("Please login first!");
      return;
    }
    setShowConfirmModal(true);
  };

  //  Confirm deletion of chat history
  const confirmClearChats = async () => {
    try {
      setIsClearing(true);
      const response = await fetch(`${BACKEND_URL}/api/thread/clear`, {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "Failed to clear chats");

      setPrevChats([]);
      setAllThreads([]);
      setNewChat(true);
      setReply(null);
      setPrompt("");
      setCurrThreadId(uuidv1());
      if (typeof refreshThreads === "function") refreshThreads();

      toast.success("All chat history cleared!");
    } catch (err) {
      console.error("Clear history error:", err);
      toast.error("Failed to clear chat history!");
    } finally {
      setIsClearing(false);
      setShowConfirmModal(false);
    }
  };

  //  Settings and Upgrade Modals
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
          {document.body.classList.contains("dark-mode")
            ? "Switch to Light Mode"
            : "Switch to Dark Mode"}
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
        <button onClick={() => toast.info("Upgrade feature coming soon!")}>
          Upgrade to Pro
        </button>
        <button onClick={() => setShowUpgrade(false)}>Close</button>
      </div>
    </div>
  );

  
  //  Frontend UI Section
  
  return (
    <div className="chatWindow">
      {/*  Navbar */}
      <div className="navbar">
        <span>SigmaGPT <i className="fa-solid fa-chevron-down"></i></span>
        <div className="userIconDiv" onClick={() => setIsOpen(!isOpen)}>
          <span className="userIcon"><i className="fa-solid fa-user"></i></span>
        </div>
      </div>

      {/*  Dropdown Menu (User / Auth options) */}
      {isOpen && (
        <div className="dropDown">
          {user ? (
            <>
              <div className="dropDownItem">{user?.name}</div>
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

      {/*  Chat Component */}
      <Chat />

      {/*  Loading Animation */}
      {loading && (
        <div className="loader">
          <ScaleLoader
            color={theme === "dark" ? "#fff" : "#000"}
            loading={loading}
            height={18}
            width={4}
          />
        </div>
      )}

      {/*  Chat Input Section */}
      <div className="chatInput">
        <div className="inputBox">
          <input
            placeholder={user ? "Ask or speak..." : "Login to start chatting..."}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && getReply()}
            disabled={!user}
          />
          {/* 🎤 Mic Control */}
          <div
            id="mic"
            onClick={() => (isRecording ? stopRecording() : startRecording())}
            style={{ opacity: user ? 1 : 0.4 }}
          >
            <i
              className={`fa-solid ${isRecording ? "fa-microphone" : "fa-microphone-slash"}`}
              style={{
                color: isRecording ? "red" : "white",
                transition: "0.3s",
                transform: isRecording ? "scale(1.2)" : "scale(1)",
              }}
            />
          </div>
          {/*  Send Button */}
          <div id="submit" onClick={getReply} style={{ opacity: user ? 1 : 0.4 }}>
            <i className="fa-solid fa-paper-plane"></i>
          </div>
        </div>

        {isRecording && <p className="info"> SigmaGPT is listening...</p>}
        <p className="info">SigmaGPT can make mistakes. Verify important info.</p>
      </div>

      {/*  Modals */}
      {showSettings && <SettingsModal />}
      {showUpgrade && <UpgradeModal />}

      {/*  Login/Register */}
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

      {/* 🧹 Clear Chat Confirmation */}
      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h3>Clear Chat History?</h3>
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

      {/*  Toast Notifications */}
      <ToastContainer position="bottom-right" autoClose={3000} theme={theme === "dark" ? "dark" : "light"} />
    </div>
  );
}

export default ChatWindow;
