# Villages cachés — Rivalité C0

**Statut :** implémenté (juil. 2026)  
**Contexte :** projet privé, choix design-first (pas de base joueurs pour A/B test)

## Décisions validées

| Décision | Choix |
|----------|--------|
| Nombre de villages | **4** |
| Scoring C0 | **Actions solo existantes** uniquement |
| Activité dédiée « village » | **Hors C0** (second temps) |
| Cycle + ligue | **Inchangés** (match H71 obligatoire, pools, promo/relégation) |

## Vision

- **Solo** = carrière Sensei (cycle, escouade, économie) — inchangé  
- **Village** = appartenance + rivalité de faction **globale**  
- **Clan joueur** = hub d’amis (12 max) — orthogonal au village  
- **Ligue** = sport de pool — reste le match de cycle  

Le village n’ajoute **aucun bonus de combat**. Cosmétiques / titres / Ryos collectifs seulement.

---

## 1. Les 4 villages

| Id | Affichage | Ton |
|----|-----------|-----|
| `leaf` | Midorihara | Discipline, tradition |
| `sand` | Kareno | Endurance, pragmatisme |
| `mist` | Oborohama | Ombre, précision |
| `stone` | Ishikura | Tenacité, défense |

Libellés joueur : noms de pays originaux (Midorihara, Kareno, Oborohama, Ishikura), sans reprise d'un lieu d'une licence existante. Ids techniques inchangés (`leaf`…).

---

## 2. Appartenance

### Quand
- **Création de compte** (humain) : choix obligatoire d’un village avant premier Bureau.
- Compte **démo / seed** : village fixé (`leaf`) pour stabilité e2e.
- **Invité** : même choix à la création invité (défaut `leaf`).

### Changement
- **1 retake gratuit** tant que `season_cycle` du Sensei ≤ 2 **et** qu’aucun score village n’a encore été contribué ce cycle.
- Ensuite : **verrouillé jusqu’au hard reset de saison** (retake flag remis à 0, village conservé).
- Pas de transfert mid-saison payant en C0.

### Orthogonalité
- Village ≠ clan ninja (Benigiri, Kazamine…)  
- Village ≠ clan joueur (`player_clans`)  
- Un Sensei a exactement **un** village.

---

## 3. Score village (actions solo)

Chaque action éligible crédite des **points village** sur le **cycle courant** (`cycle_start_at` + `village_id`).

| Action | Points | Notes |
|--------|--------|--------|
| Sceau de Chakra quotidien ouvert | **1** | 1× / jour UTC max |
| Mission idle assignée (tout rang) | **2** | À l’assignation |
| Mission idle rang C+ réussie | **4** | À la résolution (succès) |
| Recon résolue (victoire) | **5** | Mission recon gagnée |
| Recon résolue (défaite / nul) | **2** | Participation |
| Victoire match de ligue H71 | **6** | Défaite / nul : **2** |
| Examen Chunin réussi | **4** | |
| Vol d’Oiseau réussi | **8** | |

**Plafond soft / Sensei / cycle :** **40 pts**.

**Pas de score** pour : achats magasin, market P2P, messages mur, recrutement Académie.

---

## 4. Rivalité de cycle

- Paire déterministe au cycle (`season_number * 10 + current_cycle`)
- Résolution **H72** avant `resetCycle` : meilleur score gagne ; égalité = nul (pas de coffre)
- Gagnant : titre `rivalry:<id>` + **+150 Ryos** aux contributeurs ≥ 3 pts
- Nouveau cycle : nouvelle paire assurée après reset

---

## 5–8

Voir historique design : UI `/village`, bandeau Bureau, badge profil, hard reset purge scores / conserve `village_id`.

Migration : `064_village_rivalry_c0.sql`  
Service : `backend/src/services/villageService.js`

---

## 9. Critères de « done » C0

- [x] Migration + choix à l’inscription / invité
- [x] Hooks score sur les familles d’actions
- [x] Job H72 résolution + coffre + paire cycle suivant
- [x] UI `/village` + bandeau Bureau + badge profil
- [x] Seed démo `leaf` ; e2e smoke page village
- [x] Docs règles FR/EN + `game-design-reference.md`
- [x] Hard reset : purge scores, village conservé

## API

| Méthode | Route | Rôle |
|---------|-------|------|
| `GET` | `/api/village` | Classement / rivalité / contribution |
| `POST` | `/api/village/retake` | `{ villageId }` |
| `POST` | `/api/auth/register` | `villageId` obligatoire |
| `POST` | `/api/auth/guest` | `villageId` optionnel |

## Tests

`npm run test:village-rivalry --prefix backend` · `cypress/e2e/village.cy.js`

---

## 10. Suite possible (pas engagée)

| Étape | Contenu |
|-------|---------|
| **C0.1** | Activité village 1×/cycle |
| **C1** | Alléger le poids perçu de la ligue sans retirer H71 |
| **C2** | Mur village / défis inter-village |
