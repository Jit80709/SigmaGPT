#  SigmaGPT — AI Chat & Voice Assistant  


## 🚀 Overview
**SigmaGPT** is a full-stack AI-powered Chat & Voice Assistant built using the **MERN Stack** integrated with **OpenAI GPT API**.  
It supports both **text** and **voice-based conversations**, allowing users to chat naturally with an intelligent assistant.  

Includes complete user authentication, real-time responses, voice recording, dark/light themes, and chat history persistence.  

---

## ✨ Features

*** Category && Description *** 

| 💬 **AI Chat** | GPT-style conversational chat interface with Markdown & code formatting |
| 🎙️ **Voice Interaction** | Real-time Speech-to-Text input + AI Text-to-Speech response |
| 🔐 **Authentication** | JWT-based secure login, register, and logout |
| 🌓 **Themes** | One-click Light/Dark mode switch |
| 💾 **Chat Storage** | User-specific message history saved in MongoDB |
| ⚡ **Frontend Optimization** | Built with Vite for lightning-fast performance |
| 🔔 **Toast Notifications** | Real-time alerts for login/logout and API status |

---

## 🧠 Tech Stack

**Frontend:**  
- React (Vite)  
- CSS (Custom Components + Modern UI transitions)  

**Backend:**  
- Node.js  
- Express.js  
- OpenAI API (Chat + TTS + STT)  

**Database:**  
- MongoDB Atlas (via Mongoose ORM)  

**Auth & Security:**  
- JWT Tokens  
- Cookie-based session handling  
- CORS Config for frontend-backend sync  

---

## ⚙️ Environment Variables

Create a `.env` file in your backend folder and include the following 👇


PORT=8080
MONGO_URI=your_mongo_uri
OPENAI_API_KEY=your_openai_api_key
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret

