
// Utility function to communicate with the OpenAI API
// Sends user input and returns AI-generated reply


import "dotenv/config";

//  OpenAI API Endpoint
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 *  Sends a message to OpenAI API and retrieves assistant response
 * @param {string} message - The user's text input
 * @returns {Promise<string>} - The AI-generated reply
 */
const getOpenAIAPIResponse = async (message) => {
  //  Ensure API key exists before making request
  if (!process.env.OPENAI_API_KEY) {
    console.error(" Missing OPENAI_API_KEY in .env file");
    return " Server misconfiguration: Missing API key.";
  }

  //  Prepare payload for OpenAI Chat API
  const payload = {
    model: "gpt-4o-mini", //  Lightweight, fast, and cost-effective model
    messages: [{ role: "user", content: message }], // User message
    max_tokens: 800, // Prevents overly long responses
    temperature: 0.7, // Adds natural variation to responses
  };

  try {
    //  Send POST request to OpenAI API
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // Secure key
      },
      body: JSON.stringify(payload),
    });

    //  Handle API-level errors
    if (!response.ok) {
      let errorMessage = ` OpenAI API Error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage += ` - ${errorData.error?.message || "Unknown error"}`;
      } catch {
        // fallback if response is not JSON
      }
      console.error(errorMessage);
      return errorMessage;
    }

    //  Parse successful response
    const data = await response.json();

    //  Safely extract the assistant's text content
    return (
      data?.choices?.[0]?.message?.content?.trim() || // Chat model output
      data?.choices?.[0]?.text?.trim() ||             // Legacy fallback
      " No response from AI"                        // Default fallback
    );
  } catch (err) {
    //  Handle network or fetch-level errors
    console.error(" OpenAI Fetch Error:", err.message);
    return " Could not connect to OpenAI API.";
  }
};

//  Export function for use in controllers
export default getOpenAIAPIResponse;
