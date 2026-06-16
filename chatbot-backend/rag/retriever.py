from langchain_qdrant import QdrantVectorStore
from langchain_huggingface import HuggingFaceEmbeddings


# ===== Embedding =====
embedding = HuggingFaceEmbeddings(
    model_name="BAAI/bge-m3"
)


# ===== Charger Vector Store =====
vector_db = QdrantVectorStore.from_existing_collection(
    embedding=embedding,
    path="./qdrant_db",
    collection_name="products"
)


# ===== Fonction recherche =====
def search_context(question):

    results = vector_db.similarity_search_with_score(
        question,
        k=10
    )

    if not results:
        return []

    best_score = results[0][1]

    filtered = []

    for doc, score in results:

        if score >= best_score * 0.90:
            filtered.append((doc, score))

    return filtered


# ===== Test =====
question = "Avez-vous du chocolat ?"

docs = search_context(question)


for doc, score in docs:

    print("\n------------------")
    print("SCORE :", score)
    print(doc.page_content)


# ===== Fermer proprement =====
try:
    vector_db.client.close()
except:
    pass