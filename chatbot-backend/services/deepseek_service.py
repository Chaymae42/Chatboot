import requests
import os

API_KEY = os.getenv("OPENROUTER_API_KEY")

def ask_deepseek(question: str):
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "deepseek/deepseek-chat",
            "messages": [
                {"role": "user", "content": question}
            ]
        }
    )

    data = response.json()

    # extraction propre
    try:
        return data["choices"][0]["message"]["content"]
    except:
        return "Erreur API DeepSeek"