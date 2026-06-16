from langchain_ollama import OllamaLLM

# ===== llama3 =====
llama_model = OllamaLLM(model="llama3")

# ===== phi3 =====
phi_model = OllamaLLM(model="phi3")


# ===== Function llama3 =====
def ask_llama(question: str):
    return llama_model.invoke(question)


# ===== Function phi3 =====
def ask_phi(question: str):
    return phi_model.invoke(question)