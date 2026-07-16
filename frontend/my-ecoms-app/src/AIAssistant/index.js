import { useState, useRef } from "react";
import api from "../api/axios";
import "./index.css";

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const recognitionRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    console.log("Send button clicked");

    try {
      setLoading(true);

      const userMessage = input;

      /*setMessages((prev) => [
        ...prev,
        {
          sender: "user",
          text: userMessage,
        },
      ]);*/

      setMessages((prev) => {
        const updated = [
          ...prev,
          {
            sender: "user",
            text: userMessage,
          },
        ];

        console.log("Updated Messages:", updated);

        return updated;
      });

      setInput("");

      const { data } = await api.post("/api/ai/chat", {
        message: userMessage,
      });

      console.log("AI Response:", data);

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: data?.reply || "No response from AI.",
        },
      ]);
    } catch (error) {
      console.log(error);

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Sorry, something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in this browser.");
      return;
    }

    // Previous recognition ni stop cheyyi
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("Listening...");
      setInput(""); // Mic click chesina ventane previous text clear
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setTimeout(() => {
        sendMessage(transcript);
      }, 100);
    };

    recognition.onerror = (event) => {
      console.log("Speech Error:", event.error);
    };

    recognition.onend = () => {
      console.log("Stopped Listening");
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <>
      <button className="ai-floating-button" onClick={() => setIsOpen(!isOpen)}>
        🤖
      </button>

      {isOpen && (
        <div className="ai-chat-container">
          <div className="ai-chat-header">
            <h3>AI Shopping Assistant</h3>
            <button onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="ai-chat-body">
            {messages.length === 0 ? (
              <>
                <div className="ai-message ai-message-bot">
                  👋 Hi Mallikarjuna!
                </div>

                <div className="ai-message ai-message-bot">
                  I'm your AI Shopping Assistant. Ask me anything about
                  products, orders, cart or wishlist.
                </div>
              </>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={
                    message.sender === "user"
                      ? "ai-message ai-message-user"
                      : "ai-message ai-message-bot"
                  }
                >
                  {message.text}
                </div>
              ))
            )}
          </div>

          <div className="ai-chat-footer">
            <input
              type="text"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
            />
            <button onClick={sendMessage}>{loading ? "..." : "➤"}</button>
            <button onClick={startListening}>🎤</button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
