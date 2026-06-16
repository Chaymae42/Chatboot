import requests


print("\n=== Chat RAG ===")
print("Tape 'exit' pour quitter\n")


while True:

    question = input("Question : ")

    if question.lower() == "exit":
        break

    try:

        response = requests.post(
            "http://127.0.0.1:8000/rag-chat",
            json={
                "message": question,
                "model": "llama3"
            }
        )

        data = response.json()

        print("\nBot :")
        print(data["response"])

        print()

    except Exception as e:

        print("\nErreur :", e)