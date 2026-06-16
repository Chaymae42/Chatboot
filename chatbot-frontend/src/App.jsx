import "./App.css";
import { useState } from "react";
import Login from "./Login";
import Chat from "./Chat";

function App() {
  // Si un utilisateur est en mémoire (localStorage), on reste connecté
  const [user, setUser] = useState(() => localStorage.getItem("user"));

  const handleLogin = (email) => {
    localStorage.setItem("user", email);
    setUser(email);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return <Chat user={user} onLogout={handleLogout} />;
}

export default App;
