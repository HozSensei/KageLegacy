# 🏫 L'Académie — recrutement aléatoire

**Statut :** direction validée PO — **à aligner** sur tirage unique (pas de choix entre candidats).

**Distinction importante :**

| Lieu | Rôle |
| :--- | :--- |
| **L'Académie** | Recruter un **aspirant tiré au hasard** (PNJ / génération serveur) |
| **Marché Noir** (M4) | Acheter des **objets utilitaires** au catalogue serveur (3 offres / cycle) |
| **Marché entre joueurs** (futur) | **Vendre / acheter** entre Sensei — voir [`player-market.md`](./player-market.md) |

---

## Principes validés (session PO juil. 2026)

| Règle | Détail |
| :--- | :--- |
| **Pas un choix** | Un seul aspirant **tiré aléatoirement** par cycle — le joueur ne choisit pas parmi plusieurs fiches |
| **Prendre ou laisser** | Le profil est **visible** (voie, potentiel, lignée) ; le joueur paie pour recruter **cette** fiche ou passe son tour |
| **Fenêtre H0–H12** | 1 recrutement payant max par cycle |
| **Nom UI** | Bureau : section **« Académie »** — pas « Marché » ni « Recrutement » |
| **Nobles rares** | Même pondération que `clanRecruitment.js` (~10 % noble) |

---

## Tirage (V1)

```
H0 (ou premier accès Bureau du cycle)
  → serveur tire 1 aspirant Genin 15 ans (clanRecruitment + ninjaGenerator)
  → prix calculé selon lignée / potentiel
  → affiché à l'Académie jusqu'à H12 ou achat / refus implicite (cycle suivant)
```

**Prix indicatifs** (inchangés) :

| Profil | Ryos |
| :--- | :--- |
| Roturier ordinaire | 400 |
| Roturier prometteur / prodige | 650–900 |
| Clan du village | 1 200 |
| Lignée noble | 2 500–4 000 |

---

## vs Vol d'Oiseau (M7)

| | Vol d'Oiseau | Académie |
| :--- | :--- | :--- |
| Coût | Gratuit (prime à la sortie) | Payant à l'entrée |
| Profil | Roturier garanti | Tirage pondéré (noble possible) |
| Déclencheur | Chunin part | Slot libre / décision manager |

---

## Implémentation

| Étape | Statut |
| :--- | :--- |
| Tirage pondéré clans | ✅ `clanRecruitment.js` |
| Table `academy_draws` (1 ligne / user / cycle) | 🟡 refactor depuis `recruitment_offers` |
| API `GET/POST /api/academy` | 🟡 |
| UI `AcademyPanel` Bureau | 🟡 |
| Renommage « marché aspirants » → Académie | 🟡 |

---

## ⚠️ Ne pas confondre

- **L'Académie** ≠ Marché Noir objets
- **L'Académie** ≠ Marché entre joueurs ([`player-market.md`](./player-market.md))
