import { useState, useRef, useEffect } from "react";
import { sendRagChat } from "./api";

function Chat({ user, onLogout }) {
  const [message, setMessage] = useState("");
  const [model, setModel] = useState("deepseek");
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Bonjour 👋 Je suis votre assistant IA. Comment puis-je vous aider ?",
    },
  ]);

  const chatEndRef = useRef(null);

  // Ajoute un article au panier (fusionne si le produit existe déjà)
  const addToCart = (item) => {
    setCart((prev) => {
      const key = `${item.produit}|${item.format}`;
      const existing = prev.find(
        (p) => `${p.produit}|${p.format}` === key
      );
      if (existing) {
        return prev.map((p) =>
          `${p.produit}|${p.format}` === key
            ? { ...p, quantite: p.quantite + item.quantite }
            : p
        );
      }
      return [...prev, item];
    });
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.quantite * item.prix_unitaire,
    0
  );

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

      // Ajout automatique au panier si l'assistant a confirmé un achat
      if (data.cart_item) {
        addToCart(data.cart_item);
      }
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
          onClick={() => {
            setMessages([
              {
                role: "bot",
                text: "Nouvelle conversation 👋 Posez votre question.",
              },
            ]);
            setCart([]);
          }}
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

          <div className="header-right">
            {/* Icône panier avec badge compteur */}
            <button
              className="cart-button"
              onClick={() => setShowCart((v) => !v)}
              title="Voir le panier"
            >
              <span className="cart-icon">🛒</span>
              {cart.length > 0 && (
                <span className="cart-badge">{cart.length}</span>
              )}
            </button>

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

          {/* Panneau du panier */}
          {showCart && (
            <div className="cart-panel">
              <div className="cart-panel-header">
                <strong>Mon panier</strong>
                <button
                  className="cart-close"
                  onClick={() => setShowCart(false)}
                >
                  ×
                </button>
              </div>

              {cart.length === 0 ? (
                <p className="cart-empty">Votre panier est vide.</p>
              ) : (
                <>
                  <div className="cart-items">
                    {cart.map((item, i) => (
                      <div key={i} className="cart-row">
                        <div className="cart-row-info">
                          <span className="cart-row-name">
                            {item.produit}
                            {item.format ? ` (${item.format})` : ""}
                          </span>
                          <span className="cart-row-detail">
                            {item.quantite} × {item.prix_unitaire} DH
                          </span>
                        </div>
                        <span className="cart-row-total">
                          {item.quantite * item.prix_unitaire} DH
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="cart-total">
                    <span>Total</span>
                    <span>{cartTotal} DH</span>
                  </div>

                  <button
                    className="cart-clear"
                    onClick={() => setCart([])}
                  >
                    Vider le panier
                  </button>
                </>
              )}
            </div>
          )}
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
