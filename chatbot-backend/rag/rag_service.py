import re
import json

from langchain_qdrant import QdrantVectorStore
from langchain_huggingface import HuggingFaceEmbeddings

from services.llm_service import ask_llama, ask_phi
from services.deepseek_service import ask_deepseek
from rag.create_embeddings import needs_reindex, build_embeddings


# ===== Embedding =====
embedding = HuggingFaceEmbeddings(
    model_name="BAAI/bge-m3"
)


# ===== Régénération automatique si les données ont changé =====
# On vérifie AVANT d'ouvrir la base en lecture (sinon conflit de verrou).
if needs_reindex():
    print("Données modifiées : régénération des embeddings...")
    count = build_embeddings(embedding)
    print(f"{count} produits réindexés.")


# ===== Charger Qdrant =====
vector_db = QdrantVectorStore.from_existing_collection(
    embedding=embedding,
    path="./qdrant_db",
    collection_name="products"
)


def search_context(query):

    results = vector_db.similarity_search_with_score(
        query,
        k=10
    )

    if not results:
        return ""

    best_score = results[0][1]

    selected = []

    for doc, score in results:

        if score >= best_score * 0.85:
            selected.append(doc.page_content)

    return "\n\n".join(selected)


def format_history(history):
    """Transforme l'historique [{role, text}] en texte Client/Assistant."""
    if not history:
        return "(début de la conversation)"

    lines = []
    for msg in history:
        role = msg.get("role")
        text = (msg.get("text") or "").strip()
        if not text:
            continue
        if role == "user":
            lines.append(f"Client : {text}")
        else:
            lines.append(f"Assistant : {text}")

    return "\n".join(lines) if lines else "(début de la conversation)"


def extract_cart_item(text):
    """Extrait la balise [[CART]]...[[/CART]] du texte de l'assistant.
    Retourne (texte_nettoyé, cart_item ou None)."""
    if not text:
        return text, None

    match = re.search(r"\[\[CART\]\](.*?)\[\[/CART\]\]", text, re.DOTALL)

    if not match:
        return text.strip(), None

    cart_item = None
    raw = match.group(1).strip()

    try:
        data = json.loads(raw)
        # Normalisation des champs numériques
        quantite = int(float(data.get("quantite", 0)))
        prix = float(data.get("prix_unitaire", 0))
        cart_item = {
            "produit": str(data.get("produit", "")).strip(),
            "marque": str(data.get("marque", "")).strip(),
            "format": str(data.get("format", "")).strip(),
            "quantite": quantite,
            "prix_unitaire": prix,
        }
        # Un article valide doit avoir un nom et une quantité positive
        if not cart_item["produit"] or cart_item["quantite"] <= 0:
            cart_item = None
    except (ValueError, TypeError):
        cart_item = None

    # On retire la balise du texte affiché au client
    clean_text = re.sub(
        r"\[\[CART\]\].*?\[\[/CART\]\]", "", text, flags=re.DOTALL
    ).strip()

    return clean_text, cart_item


def build_search_query(question, history):
    """Construit la requête de recherche à partir des derniers messages du client.
    Utile car une réponse courte (ex: 'Salim') n'a pas assez de sens seule."""
    user_messages = []
    if history:
        for msg in history:
            if msg.get("role") == "user" and msg.get("text"):
                user_messages.append(msg["text"])

    # On garde les 3 derniers messages du client + la question courante
    recent = user_messages[-3:]
    recent.append(question)
    return " ".join(recent)


# ===== Règles de l'assistant (système) =====
SYSTEM_RULES = """
Tu es un assistant de vente d'un supermarché. Tu parles toujours en français,
de façon polie, claire et naturelle.

Tu DOIS suivre exactement ce mode de fonctionnement :

1) DEMANDER LA MARQUE
- Si le client demande un produit général (ex: "je veux du lait", "du café",
  "du fromage") et que plusieurs marques existent dans le contexte,
  ne donne PAS encore les informations.
  Demande d'abord quelle marque il souhaite, sous forme de liste à puces,
  et ajoute toujours l'option "Autre".
  Exemple :
  "Quelle marque de lait souhaitez-vous ?
  • Jaouda
  • Salim
  • Centrale
  • Autre"

2) AFFICHER LE PRODUIT
- Quand le produit (et la marque si nécessaire) est identifié et EN STOCK,
  confirme la disponibilité puis affiche les informations sous cette forme,
  chaque information sur une nouvelle ligne :
  "Oui, le produit est disponible.
  Informations du produit :
  • Produit : ...
  • Marque : ...
  • Format : ...
  • Prix : ... DH
  • Emplacement : ..."
- S'il existe une promotion (champ promo), ajoute une ligne "• Offre : ...".
- Termine TOUJOURS en demandant : "Quelle quantité souhaitez-vous ?"

3) CONFIRMER LA QUANTITÉ (ET AJOUTER AU PANIER)
- Quand le client donne une quantité pour un produit disponible, confirme :
  "Très bien. Vous avez choisi {quantité} {produit} {format}."
- Si une promotion s'applique à cette quantité, mentionne-la
  (ex: "Vous bénéficiez de la promotion : 2 cafés pour 55 DH").
- DANS CE CAS UNIQUEMENT (un achat est confirmé avec une quantité précise),
  tu DOIS ajouter, tout à la fin de ta réponse, une balise technique au format
  EXACT suivant, sur une seule ligne, contenant du JSON valide :
  [[CART]]{"produit": "...", "marque": "...", "format": "...", "quantite": 0, "prix_unitaire": 0}[[/CART]]
  - "quantite" = la quantité demandée par le client (nombre entier).
  - "prix_unitaire" = le prix unitaire du produit en DH (nombre, sans texte).
  - N'ajoute cette balise QUE si un produit est réellement choisi avec sa quantité.
  - N'explique JAMAIS cette balise au client, ne la commente pas.

4) RUPTURE DE STOCK (stock = 0 avec restock_days)
- Indique que le produit est en rupture de stock et sa date de retour estimée.
  Propose ensuite des alternatives disponibles de la même catégorie, en liste.

5) PRODUIT SAISONNIER (champ seasonal)
- Explique que c'est un produit saisonnier et qu'il n'est pas disponible
  actuellement, puis demande si le client veut chercher un autre produit.

6) PRODUIT INEXISTANT
- Si le produit demandé n'apparaît PAS du tout dans le contexte,
  réponds : "Ce produit n'existe pas dans notre magasin."
  puis demande : "Est-ce que vous souhaitez chercher un autre produit ?"

7) COMPARAISON
- Si le client demande une comparaison entre deux produits,
  présente-les clairement (Produit, Marque, Format, Prix, Particularité)
  et indique les différences.

8) QUESTIONS SUGGÉRÉES (TRÈS IMPORTANT)
- À la fin de CHAQUE réponse, propose de 1 à 3 questions de suivi pertinentes,
  adaptées au produit ou au contexte, sous ce format exact :
  "Questions suggérées :
  • ...
  • ..."
  Exemples selon le cas : proposer une promotion, une alternative moins chère,
  une autre marque, l'emplacement du rayon, ou demander s'il veut un autre produit.

RÈGLES GÉNÉRALES :
- N'invente JAMAIS un produit, une marque, un prix ou un emplacement.
- Utilise uniquement les informations du contexte.
- Reste fidèle au fil de la conversation (utilise l'historique).
"""


def ask_rag(question, model, history=None):

    search_query = build_search_query(question, history)
    context = search_context(search_query)
    conversation = format_history(history)

    prompt = f"""{SYSTEM_RULES}

=========================
HISTORIQUE DE LA CONVERSATION :
{conversation}

=========================
CONTEXTE (produits disponibles dans le magasin) :
{context}

=========================
DERNIER MESSAGE DU CLIENT :
{question}

Réponds maintenant en tant qu'assistant, en respectant strictement les règles
ci-dessus et en t'appuyant uniquement sur le contexte.
"""

    # Choix du modèle selon la sélection du frontend
    if model == "deepseek":
        response = ask_deepseek(prompt)
    elif model == "phi3":
        response = ask_phi(prompt)
    else:  # "local" ou valeur par défaut
        response = ask_llama(prompt)

    clean_text, cart_item = extract_cart_item(response)

    return {
        "response": clean_text,
        "cart_item": cart_item,
    }
