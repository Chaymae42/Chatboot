import json


# ===== Charger JSON =====
with open("data/products.json", "r", encoding="utf-8") as file:
    data = json.load(file)


# ===== Conversion générique =====
documents = []

for item in data:

    text = "\n".join(
        [f"{key}: {value}" for key, value in item.items()]
    )

    documents.append(text)


# ===== Test affichage =====
for doc in documents:
    print("------------------")
    print(doc)