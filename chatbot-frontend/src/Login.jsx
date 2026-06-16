import { useState } from "react";
import { login, register } from "./api";

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
        // Après inscription, on connecte directement
      }

      const data = await login(email, password);

      if (data.error) {
        setError("Email ou mot de passe incorrect.");
      } else {
        onLogin(email);
      }
    } catch (err) {
      setError("Impossible de joindre le serveur. Vérifiez le backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      {/* Bulles décoratives en arrière-plan */}
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />

      <div className="auth-card">
        {/* Mascotte robot */}
        <div className="auth-bot">
          <div className="auth-bot-eyes">
            <span />
            <span />
          </div>
        </div>

        <h1 className="auth-title">Chatbot IA</h1>
        <p className="auth-subtitle">
          {isRegister
            ? "Créez votre compte pour commencer"
            : "Bienvenue 👋 Connectez-vous pour continuer"}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">Email</label>
          <input
            type="email"
            className="auth-input"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="auth-label">Mot de passe</label>
          <input
            type="password"
            className="auth-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading
              ? "Chargement..."
              : isRegister
              ? "Créer un compte"
              : "Get Started"}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? "Vous avez déjà un compte ?" : "Pas encore de compte ?"}{" "}
          <span
            className="auth-link"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
          >
            {isRegister ? "Log In" : "S'inscrire"}
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;
