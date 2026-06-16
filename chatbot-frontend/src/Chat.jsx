import { useState, useRef, useEffect } from "react";
import { sendRagChat } from "./api";

function Chat({ user, onLogout }) {
  const [message, setMessage] = useState("");
  const [model, setModel] = useState("deepseek");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Bonjour 👋 Je suis votre assistant IA. Comment puis-je vous aider ?",
    },
  ]);

  const chatEndRef = useRef(null);

  // Scroll automatique vers le dernier message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = message.trim();
    if (!text || loading) return;

    // Historique envoyé au backend (on garde les 12 derniers messages)
    const history = messages.slice(-12);

    // Ajoute le message utilisateur
    setMessages((prev) => [...prev, { role: "user", text }]);
    setMessage("");
    setLoading(true);

    try {
      const data = await sendRagChat(text, model, history);
      const botText = data.response || data.error || "Aucune réponse reçue.";
      setMessages((prev) => [...prev, { role: "bot", text: botText }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "⚠️ Erreur de connexion au serveur." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo">
          <div className="logo-bot">
            <span />
            <span />
          </div>
          Chatbot IA
        </div>

        <button
          className="new-chat"
          onClick={() =>
            setMessages([
              {
                role: "bot",
                text: "Nouvelle conversation 👋 Posez votre question.",
              },
            ])
          }
        >
          + Nouveau Chat
        </button>

        <div className="model-select">
          <label>Modèle</label>
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="deepseek">DeepSeek</option>
            <option value="local">Local (Llama)</option>
            <option value="phi3">Phi-3</option>
          </select>
        </div>

        <div className="history">
          <div className="history-item">Conversation 1</div>
          <div className="history-item">Conversation 2</div>
          <div className="history-item">Conversation 3</div>
        </div>

        <button className="logout-btn" onClick={onLogout}>
          Déconnexion
        </button>
      </div>

      {/* Main */}
      <div className="main">
        {/* Header */}
        <div className="header">
          <h2>Assistant IA</h2>
          <div className="profile">
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                user || "User"
              )}&background=005BAC&color=fff`}
              alt="profile"
            />
            <span>{user || "Utilisateur"}</span>
          </div>
        </div>

        {/* Chat */}
        <div className="chat-area">
          {messages.map((m, i) => (
            <div key={i} className={`message ${m.role}`}>
              {m.text}
            </div>
          ))}

          {loading && (
            <div className="message bot typing">
              <span />
              <span />
              <span />
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="input-area">
          <input
            type="text"
            placeholder="Tapez votre message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleSend} disabled={loading}>
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
