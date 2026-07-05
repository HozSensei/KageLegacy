# 🏪 Recrutement & marché des ninjas (vision)

**Statut :** règles de rareté implémentées à la génération ; **marché aspirants livré** (migration 017, API `/api/recruitment`).

---

## 🎯 Principes

| Règle | Détail |
| :--- | :--- |
| **Lignée noble = rare** | Nara, Uchiwa, Hyuga : ~**10 %** des recrutements |
| **Clan du village = peu commun** | Sarutobi, Akimichi, Yamanaka : ~**25 %** |
| **Roturier = majorité** | Sans suffixe de clan, pas de bonus génétique : ~**65 %** |
| **Le talent reste indépendant** | Un roturier peut être prodige ; un Uchiwa peut être ordinaire |
| **Pas de collection infinie** | Effectif plafonné ; chaque départ (Vol d'Oiseau) ouvre un slot |

---

## 🧬 Tirage actuel (`clanRecruitment.js`)

```
roll 0–100
├── 0–10   → lignée noble (si disponible)
├── 10–35  → clan du village
└── 35–100 → Roturier (prénom seul, ex. « Haru »)
```

Affichage :
- Roturier : pas de « Nom Clan » dans le nom
- Clan : « Rei Yamanaka », badge « Lignée noble » si `is_noble`

---

## 🐣 Relève automatique (M7 — Vol d'Oiseau)

Quand un Chunin part en Jonin :

| Option | Coût | Profil |
| :--- | :--- | :--- |
| **Aspirant gratuit** (défaut) | 0 Ryos | Roturier, Genin 15 ans, potentiel tirage normal |
| *(futur)* **Recrutement payant** | Ryos | Voir marché aspirants ci-dessous |

Le remplacement gratuit **ne doit jamais** garantir une lignée noble — sinon les clans deviennent communs.

---

## 📅 Marché aspirants (backlog — 1× par cycle / « semaine »)

**Fenêtre :** H0–H12 (ouverture du cycle), **1 achat max** par Sensei et par cycle.

**Distinct du Marché Noir objets** (3 utilitaires) — autre onglet Bureau : « Recrutement ».

### Offre type

Le serveur génère **2 à 3 candidats** avec profils visibles (voie, potentiel, lignée) :

| Candidat | Lignée | Prix indicatif |
| :--- | :--- | :--- |
| Roturier ordinaire | Sans lignée | 400 Ryos |
| Roturier prometteur | Sans lignée | 900 Ryos |
| Clan village | Sarutobi… | 1 200 Ryos |
| Lignée noble | Nara / Uchiwa / Hyuga | 2 500–4 000 Ryos |

### Vente / départ (futur)

- Ninja **non actif** (banc) peut être **licencié** contre une fraction de sa valeur (réputation -, Ryos +)
- Ninja **actif** : interdit (doit d'abord être retiré de l'escouade)
- Vol d'Oiseau : vente impossible — cérémonie uniquement

*À ne pas confondre avec le marché d'**objets** M4.*

---

## 💰 Lien économie Ryos

| Dépense | Fréquence |
| :--- | :--- |
| Salaires H72 | Chaque cycle |
| Dispensaire | Quand forme baisse |
| Examen Chunin | Ponctuel |
| **Aspirant payant** | 1× / cycle (futur) |
| **Noble au marché** | Rare, gros ticket |

Les Ryos servent à **choisir** sa relève, pas seulement à survivre.

---

## 🛠️ Implémentation

| Étape | Statut |
| :--- | :--- |
| Migration `Roturier` + tirage pondéré | ✅ 009 + `clanRecruitment.js` |
| Seed démo avec rareté | ✅ |
| `profile.clanTier` dans API | ✅ |
| Table `recruitment_offers` + UI | ✅ Bureau · `RecruitmentPanel` · H0–H12 |
| Licenciement / revente | Backlog M7+ |

---

## ⚠️ Garde-fous design

- Ne jamais mettre de noble dans le marché **objets**
- Limiter les nobles dans l'effectif initial démo (seed aléatoire OK)
- Bots ligues : majorité roturiers ; nobles occasionnels pour variété
