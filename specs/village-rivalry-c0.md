# Villages cachés — Rivalité C0

**Statut :** design figé (juil. 2026) — pas encore implémenté  
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

| Id | Nom FR | Nom EN | Ton |
|----|--------|--------|-----|
| `leaf` | Village de la Feuille | Hidden Leaf | Discipline, tradition |
| `sand` | Village du Sable | Hidden Sand | Endurance, pragmatisme |
| `mist` | Village de la Brume | Hidden Mist | Ombre, précision |
| `stone` | Village de la Roche | Hidden Stone | Tenacité, défense |

Pas de 5ᵉ village en C0 (évite les matchups asymétriques et le dilution).

---

## 2. Appartenance

### Quand
- **Création de compte** (humain) : choix obligatoire d’un village avant premier Bureau.
- Compte **démo / seed** : village fixé (`leaf`) pour stabilité e2e.
- **Invité** : même choix à la création invité.

### Changement
- **1 retake gratuit** tant que `season_cycle` du Sensei ≤ 2 **et** qu’aucun score village n’a encore été contribué ce cycle.
- Ensuite : **verrouillé jusqu’au hard reset de saison** (même logique que wipe gameplay).
- Pas de transfert mid-saison payant en C0.

### Orthogonalité
- Village ≠ clan ninja (Uchiwa, Hyuga…)  
- Village ≠ clan joueur (`player_clans`)  
- Un Sensei a exactement **un** village.

---

## 3. Score village (actions solo)

Chaque action éligible crédite des **points village** sur le **cycle courant** (`cycle_start_at` + `village_id`).

| Action | Points | Notes |
|--------|--------|--------|
| Sceau de Chakra quotidien ouvert | **1** | 1× / jour UTC max |
| Mission idle assignée (tout rang) | **2** | À l’assignation |
| Mission idle rang C+ collectée avec succès | **4** | Remplace / s’ajoute ? → **s’ajoute** aux 2 d’assignation si déjà comptés |
| Recon résolue (victoire) | **5** | Mission recon gagnée |
| Recon résolue (défaite / nul) | **2** | Participation |
| Victoire match de ligue H71 | **6** | Défaite / nul : **2** |
| Examen Chunin réussi | **4** | |
| Vol d’Oiseau réussi | **8** | |

**Plafond soft / Sensei / cycle :** **40 pts** (évite qu’un seul joueur hardcore porte tout le village en early private).

**Pas de score** pour : achats magasin, market P2P, messages mur, recrutement Académie (trop pay-to-score).

Agrégation : `SUM(points)` par village pour le cycle ; classement serveur des 4 villages.

---

## 4. Rivalité de cycle

### Appariement
- Au **H0** (ou à la création du cycle) : tirage d’**une paire** parmi les 4 villages.  
  Ex. Feuille vs Brume ; Sable et Roche sont « en réserve » (score toujours compté, mais pas en guerre active).
- Rotation déterministe possible : table cyclique sur `season_number * 10 + current_cycle` pour reproductibilité.

### Victoire de rivalité
À **H72**, parmi la paire active :
- Village avec le **plus haut score cycle** gagne.
- Égalité : **nul** — pas de récompense de guerre (ou coffre réduit, C0 = pas de récompense si nul).

### Récompenses (gagnant uniquement)

| Récompense | Détail |
|------------|--------|
| Titre de cycle | Ex. « Rivalité — Feuille (cycle N) » affiché profil |
| Coffre égalitaire | **+150 Ryos** à chaque membre du village gagnant ayant contribué **≥ 3 pts** ce cycle |
| Rien en combat | Pas de buff stats / forme / deck |

Les villages hors paire : pas de coffre de guerre (leur score reste visible au classement général).

---

## 5. Classement & UX

### Page `/village`
- Village du joueur + blurb
- Classement des 4 (score cycle + score saison = somme des cycles de la saison ligue courante)
- Rivalité en cours (paire + scores tête-à-tête)
- « Comment scorér » (tableau des actions)
- Top contributeurs du village (opt. C0)

### Bureau
- Bandeau discret : rivalité active + écart de score
- Pas de soft-hide d’autres panneaux

### Identité
- Badge village sur profil Sensei, classement ligue, mur

### Ligue
- **Aucun changement** de règles pools / H71 / promo

---

## 6. Hard reset saison

Aligné sur `season:hard-reset` :
- Scores cycle / saison village **purgés**
- Appartenance village **conservée** (identité) — retake reset comme les flags onboarding (1 retake early redevient dispo)
- Ou variante : forcer re-choix au hard reset — **C0 = conserver le village**, retake early seulement

---

## 7. Hors scope C0 (second temps)

- Activité dédiée « mission / guerre village »
- Mur de village
- Matchmaking recon prioritaire vs village rival
- Bonus combat, crafts exclusifs, shop village
- 5ᵉ village, alliances inter-villages

---

## 8. Modèle données (indicatif)

```
sensei.village_id ENUM('leaf','sand','mist','stone') NOT NULL
sensei.village_retake_used TINYINT(1) DEFAULT 0

village_score_events (
  id, user_id, village_id, cycle_start_at,
  action_key, points, created_at
)

village_cycle_totals (
  village_id, cycle_start_at, points, PRIMARY KEY (village_id, cycle_start_at)
)

village_rivalries (
  cycle_start_at, village_a, village_b, winner_village_id NULL
)
```

Hooks d’émission : sceau, mission assign/collect, recon resolve, match ligue apply, chunin, bird flight — **fire-and-forget** vers un `villageScoreService.record(...)`.

---

## 9. Critères de « done » C0 (sans joueurs live)

- [ ] Migration + choix à l’inscription / invité
- [ ] Hooks score sur les 6 familles d’actions
- [ ] Job H0 rivalité + job H72 résolution + coffre
- [ ] UI `/village` + bandeau Bureau + badge profil
- [ ] Seed démo `leaf` ; e2e smoke page village
- [ ] Docs règles FR/EN + `game-design-reference.md`
- [ ] Hard reset : purge scores, village conservé

---

## 10. Suite possible (pas engagée)

| Étape | Contenu |
|-------|---------|
| **C0.1** | Activité village 1×/cycle (mission collective légère) |
| **C1** | Optionnel : alléger le poids perçu de la ligue **sans** retirer H71 |
| **C2** | Mur village / défis inter-village |
