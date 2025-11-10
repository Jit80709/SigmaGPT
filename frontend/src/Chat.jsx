
//  Purpose:
// Renders the complete chat interface for SigmaGPT.
// Handles message history display, Markdown rendering,
// syntax highlighting for code blocks, and the typing effect.


import "./Chat.css";
import React, { useContext, useState, useEffect } from "react";
import { MyContext } from "./MyContext.jsx";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";


//  Chat Component

// Displays:
//  All previous chat messages (user + assistant)
// Typing animation for the latest AI reply
// - Markdown-rendered responses with syntax highlighting

function Chat() {
  //  Access shared chat data from context
  const { newChat, prevChats, reply } = useContext(MyContext);

  // Stores the typing-effect portion of the AI's latest reply
  const [latestReply, setLatestReply] = useState(null);

  
  //  Typing Effect for Assistant Reply

  // Creates a “typewriter” animation for the GPT response
  // by revealing one word at a time every 40ms.
  
  useEffect(() => {
    if (!reply) {
      setLatestReply(null); // reset if there's no reply
      return;
    }

    const words = reply.split(" ");
    let idx = 0;

    const interval = setInterval(() => {
      setLatestReply(words.slice(0, idx + 1).join(" "));
      idx++;
      if (idx >= words.length) clearInterval(interval);
    }, 40);

    return () => clearInterval(interval); // cleanup on component unmount
  }, [reply]);

  
  //  Render Section
  
  //  If it's a new chat, show a “Start a New Chat!” message
  //  Then show all previous messages and the latest GPT reply
  
  return (
    <>
      {/*  Show greeting when a new chat starts */}
      {newChat && <h1>Start a New Chat!</h1>}

      {/*  Main chat container */}
      <div className="chats">
        {/*  Display all previous messages except the last one */}
        {prevChats?.slice(0, -1).map((chat, idx) => (
          <div
            key={idx}
            className={chat.role === "user" ? "userDiv" : "gptDiv"}
          >
            {/*  User message bubble */}
            {chat.role === "user" ? (
              <p className="userMessage">{chat.content}</p>
            ) : (
              /* Assistant reply rendered with Markdown + code highlighting */
              <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                {chat.content}
              </ReactMarkdown>
            )}
          </div>
        ))}

        {/* Show typing effect for the latest assistant reply */}
        {prevChats.length > 0 && (
          <div className="gptDiv" key="last-msg">
            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
              {latestReply ?? prevChats[prevChats.length - 1].content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </>
  );
}

export default Chat;
