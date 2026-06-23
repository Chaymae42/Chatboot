import { useState, useRef, useEffect } from "react";
import {
  sendRagChat,
  createConversation,
  listConversations,
  getConversation,
  addMessage,
  deleteConversation,
} from "./api";

const WELCOME = {
  role: "bot",
  text: "Bonjour 👋 Je suis votre assistant IA. Comment puis-je vous aider ?",
};

function Chat({ user, onLogout }) {
  const [message, setMessage] = useState("");
  const [model, setModel] = useState("deepseek");
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [messages, setMessages] = useState([WELCOME]);

  const chatEndRef = useRef(null);

  // Charge la liste des conversations de l'utilisateur au démarrage
  useEffect(() => {
    let active = true;
    listConversations(user)
      .then((list) => {
        if (active) setConversations(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  const refreshConversations = () => {
    listConversations(user)
      .then(setConversations)
      .catch(() => {});
  };

  // Démarre une nouvelle conversation (sans conversation enregistrée pour l'instant)
  const startNewChat = () => {
    setMessages([WELCOME]);
    setCart([]);
    setCurrentConvId(null);
  };

  // Charge une conversation existante depuis la base
  const loadConversation = async (id) => {
    try {
      const conv = await getConversation(id);
      const msgs = (conv.messages || []).map((m) => ({
        role: m.role,
        text: m.text,
      }));
      setMessages(msgs.length ? msgs : [WELCOME]);
      setCurrentConvId(id);
      setCart([]);
      setShowCart(false);
    } catch (e) {
      // ignore
    }
  };

  // Supprime une conversation
  const removeConversation = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      if (id === currentConvId) startNewChat();
      refreshConversations();
    } catch (err) {
      // ignore
    }
  };

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

  const formatNumber = (value) =>
    Number(value).toLocaleString("fr-FR", {
      maximumFractionDigits: 2,
    });

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
      // On s'assure qu'une conversation existe en base pour la sauvegarde
      let convId = currentConvId;
      if (!convId) {
        try {
          const conv = await createConversation(user, text.slice(0, 50));
          convId = conv.id;
          setCurrentConvId(convId);
        } catch (e) {
          // la sauvegarde échoue mais le chat continue
        }
      }

      if (convId) {
        try {
          await addMessage(convId, "user", text);
        } catch (e) {
          // ignore
        }
      }

      const data = await sendRagChat(text, model, history);
      const botText = data.response || data.error || "Aucune réponse reçue.";
      setMessages((prev) => [...prev, { role: "bot", text: botText }]);

      // Ajout automatique au panier si l'assistant a confirmé un achat
      if (data.cart_item) {
        addToCart(data.cart_item);
      }

      // Sauvegarde de la réponse + rafraîchissement de la liste
      if (convId) {
        try {
          await addMessage(convId, "bot", botText);
        } catch (e) {
          // ignore
        }
        refreshConversations();
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

        <button className="new-chat" onClick={startNewChat}>
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
          {conversations.length === 0 ? (
            <div className="history-empty">Aucune conversation</div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`history-item ${
                  c.id === currentConvId ? "active" : ""
                }`}
                onClick={() => loadConversation(c.id)}
              >
                <span className="history-item-title">{c.title}</span>
                <button
                  className="history-delete"
                  onClick={(e) => removeConversation(c.id, e)}
                  title="Supprimer"
                >
                  ×
                </button>
              </div>
            ))
          )}
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
                            {formatNumber(item.quantite)} ×{" "}
                            {formatNumber(item.prix_unitaire)} DH
                          </span>
                        </div>
                        <span className="cart-row-total">
                          {formatNumber(
                            item.quantite * item.prix_unitaire
                          )}{" "}
                          DH
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="cart-total">
                    <span>Total</span>
                    <span>{formatNumber(cartTotal)} DH</span>
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
