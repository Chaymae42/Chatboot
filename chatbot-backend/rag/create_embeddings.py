import json
import os
import shutil

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore


# ===== Chemins =====
DATA_PATH = "data/products.json"
DB_PATH = "./qdrant_db"
COLLECTION = "products"


def needs_reindex():
    """Retourne True si la base doit être régénérée.
    C'est le cas si la base n'existe pas, ou si products.json a été
    modifié plus récemment que la base Qdrant."""
    if not os.path.exists(DB_PATH):
        return True

    if not os.path.exists(DATA_PATH):
        return False

    return os.path.getmtime(DATA_PATH) > os.path.getmtime(DB_PATH)


def build_embeddings(embedding=None):
    """(Re)construit la base vectorielle Qdrant à partir de products.json.
    L'objet embedding peut être réutilisé pour éviter de recharger le modèle."""

    # Supprimer l'ancienne base pour repartir propre
    if os.path.exists(DB_PATH):
        shutil.rmtree(DB_PATH)

    # Charger les données
    with open(DATA_PATH, "r", encoding="utf-8") as file:
        data = json.load(file)

    # Conversion générique : chaque produit -> texte "clé: valeur"
    documents = []
    for item in data:
        text = "\n".join(
            [f"{key}: {value}" for key, value in item.items()]
        )
        documents.append(text)

    # Modèle d'embedding (réutilisé si fourni)
    if embedding is None:
        embedding = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")

    # Création de la base Qdrant
    vector_store = QdrantVectorStore.from_texts(
        documents,
        embedding,
        path=DB_PATH,
        collection_name=COLLECTION,
    )

    # IMPORTANT : libérer le verrou pour que le backend puisse rouvrir la base
    try:
        vector_store.client.close()
    except Exception:
        pass

    return len(documents)


if __name__ == "__main__":
    count = build_embeddings()
    print(f"{count} produits indexés - Vector Store Qdrant créé avec succès")
