import { useState, useRef } from "react";
import api from "../api/axios";
import "./index.css";

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const recognitionRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (message = input) => {
    const userMessage = message.trim();
    if (!userMessage || loading) return;

    try {
      setLoading(true);

      setMessages((prev) => {
        return [
          ...prev,
          {
            sender: "user",
            text: userMessage,
          },
        ];
      });

      setInput("");

      const { data } = await api.post("/api/ai/chat", {
        message: userMessage,
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text:
            data?.reply ||
            (data?.products?.length
              ? data.products
                  .map((product) => `${product.name} - ₹${product.price}`)
                  .join("\n")
              : "No response from AI."),
        },
      ]);
    } catch (error) {
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

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setInput("");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      sendMessage(transcript);
    };

    recognition.onerror = (event) => {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "Speech recognition failed. Please type your message." },
      ]);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <>
      <button
        className="ai-floating-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close shopping assistant" : "Open shopping assistant"}
      >
        🤖
      </button>

      {isOpen && (
        <div className="ai-chat-container">
          <div className="ai-chat-header">
            <h3>AI Shopping Assistant</h3>
            <button onClick={() => setIsOpen(false)} aria-label="Close assistant">
              ✕
            </button>
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
              aria-label="Message shopping assistant"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
            />
            <button onClick={() => sendMessage()} disabled={loading} aria-label="Send message">
              {loading ? "..." : "➤"}
            </button>
            <button onClick={startListening} aria-label="Start voice input">🎤</button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
