// Adresse du backend FastAPI
const API_URL = "http://localhost:8000";

// Petit utilitaire pour gérer les requêtes POST en JSON
async function postJSON(path, body) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Erreur serveur (${response.status})`);
  }

  return response.json();
}

async function getJSON(path) {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Erreur serveur (${response.status})`);
  }
  return response.json();
}

async function deleteRequest(path) {
  const response = await fetch(`${API_URL}${path}`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Erreur serveur (${response.status})`);
  }
  return response.json();
}

// --- Authentification ---

export function login(email, password) {
  return postJSON("/login", { email, password });
}

export function register(email, password) {
  return postJSON("/register", { email, password });
}

// --- Chat ---
// model : "local" | "deepseek" | "phi3" pour /chat
export function sendChat(message, model = "deepseek") {
  return postJSON("/chat", { message, model });
}

// Chat avec RAG (recherche documentaire)
// history : tableau [{ role: "user"|"bot", text: "..." }] pour la mémoire de conversation
export function sendRagChat(message, model = "deepseek", history = []) {
  return postJSON("/rag-chat", { message, model, history });
}

// --- Historique des conversations (PostgreSQL) ---

export function createConversation(userEmail, title = "Nouvelle conversation") {
  return postJSON("/conversations", { user_email: userEmail, title });
}

export function listConversations(email) {
  return getJSON(`/conversations?email=${encodeURIComponent(email)}`);
}

export function getConversation(id) {
  return getJSON(`/conversations/${id}`);
}

export function addMessage(conversationId, role, text) {
  return postJSON(`/conversations/${conversationId}/messages`, { role, text });
}

export function deleteConversation(id) {
  return deleteRequest(`/conversations/${id}`);
}
