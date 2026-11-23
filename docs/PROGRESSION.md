# Économie et progression

## Monnaies

Le profil possède :

- Ryos ;
- poussière de cartes ;
- essence de cartes ;
- Kage Coins.

Ryos, poussière et essence sont produits par le jeu. Les Kage Coins servent notamment aux boosters premium, aux niveaux premium et aux paiements de boutique.

À la création de compte, le profil reçoit **1400 Ryos** (`STARTING_RYOS` dans `economyConfig.js`) — de quoi ouvrir environ **2 boosters** (voie 550) et compléter un starter en rareté Normale.

Le **guide du novice** (hub) propose 10 étapes one-shot (profil, decks, talent, collection, combat, règles, Battle Pass, village, boutique). Chaque étape terminée se **réclame** pour de petits gains Ryos/XP (≈ 460 Ryos et ≈ 240 XP au total). Distinct des succès et du Battle Pass.

## Boosters

Chaque booster contient 5 cartes.

| Booster     |           Coût | Poids commun / rare / légendaire / mythique |
| ----------- | -------------: | ------------------------------------------: |
| Standard    |       300 Ryos |                         700 / 230 / 55 / 15 |
| Voie (×4)   |       550 Ryos |                         650 / 260 / 70 / 20 |
| Élémentaire |       650 Ryos |                         650 / 260 / 70 / 20 |
| Premium     | 100 Kage Coins |                        550 / 320 / 100 / 30 |

Le booster premium garantit une rare ou mieux. Les parchemins de voie filtrent par `stat_type` (Taijutsu, Ninjutsu, Genjutsu, Médecine). Le booster élémentaire accepte un élément optionnel. Les cartes d'une autre saison marquées exclusives sont écartées du tirage.

Le serveur décide le tirage et prélève le coût. Les listes de cartes envoyées par le client ne sont pas utilisées.

## Packs de Kage Coins

| Identifiant | Coins reçus | Prix EUR |
| ----------- | ----------: | -------: |
| `spark`     |         100 |        1 |
| `ember`     |         550 |        5 |
| `forge`     |        1400 |       10 |
| `vault`     |        7500 |       50 |

Le paiement Stripe est documenté dans [Exploitation](OPERATIONS.md).

## Pack de bienvenue

Offre **one-shot** à 5 € (`welcome`) : Battle Pass Premium de la saison courante, titre de profil « Mécène du Village », et 1 booster standard (5 cartes). Si aucune saison n’est active au fulfillment, 500 Kage Coins remplacent le premium. Une seule fois par compte.

## Désenchantement et amélioration

Désenchantement :

- normale : 10 poussière ;
- rare : 40 poussière ;
- légendaire : 200 poussière ;
- mythique : 1000 poussière.

Les coûts d'amélioration sont centralisés dans `backend/src/config/economyConfig.js`. Le niveau maximum courant est 2, avec des restrictions possibles par rareté.

## Talents

Le catalogue comprend 72 talents, répartis en quatre piliers de six paliers : Taijutsu, Ninjutsu, Genjutsu et Médecine. Il n'existe plus de branche centrale ni de catégorie Keystone. Un talent progressif possède jusqu'à trois rangs ; une technique puissante se débloque en un seul rang.

Le niveau maximal est 80 et chaque passage de niveau donne un point. Les 138 points nécessaires pour compléter tout le catalogue dépassent volontairement ce plafond. Aucun talent n'ajoute de Chakra maximal, ne rend de Chakra ni ne modifie le coût des cartes.

Chaque palier exige un minimum de points investis dans son pilier. Certains nœuds imposent en plus le talent lié du palier précédent. Le reset rembourse chaque rang investi ; il reste gratuit une fois tous les 10 niveaux atteints, sinon il coûte 2000 Ryos.

Le seed convertit les investissements de l'ancien arbre vers les nouveaux nœuds : chaque point historique devient un rang dans le pilier correspondant, sans être perdu. Le moteur n'active que les effets reconnus par `talentEffects.js`.

## Battle Pass

Les saisons durent **90 jours** et sont **générées automatiquement** (template + scheduler minuit UTC) : track free/premium 50 niveaux, quêtes daily/weekly/milestone, thème cyclique. Le premium **ne se reporte pas** d’une saison à l’autre.

- XP de base : 1000 par niveau, avec une hausse de 50 par tranche de 10 niveaux ;
- premium : 500 Kage Coins ou 5 EUR ;
- bonus d'XP premium : `×1,2` ;
- achat de niveau : 150 Kage Coins, disponible à partir du niveau 30, 20 niveaux maximum par opération ;
- récompenses gratuites et premium réclamées séparément ;
- titre de saison (`season_N`) sur la piste premium (niveaux 1 et 50) — permanent une fois débloqué.

Les quêtes daily/weekly sont rafraîchies automatiquement. Les récompenses de type `nickname` débloquent un titre de profil. Les boosters BP accordent un lot fixe de cartes (pas le tirage boutique complet). Les anciens `cosmetic` restent filtrés à l’affichage.

## Succès

15 succès existent dans cinq catégories : combat, missions, collection, maîtrise et progression. Chaque succès possède plusieurs paliers et ses récompenses sont réclamées manuellement.

Récompenses possibles : Ryos, poussière, essence ou XP.

Les hooks actifs suivent notamment : victoires, bosses, séries, défis de combat, runs terminés, collection, taille de deck et talents dépensés.

## Missions et récompenses

5 missions (une par rang D–S) sont initialisées dans le schéma. Chaque lancement génère un parcours aléatoire (combats + nœuds « ? »).

Accès cumulatif selon le rang du personnage : Aspirant/Genin → D+C ; Chunin/Jonin → +B+A ; ANBU/Kage → +S. Les difficultés d’encounter montent dans le run (voir `missionPathConfig.js`) ; early fights sont un peu adoucis pour la clearance, le pic final reste exigeant. Un nœud de récupération est garanti ; le mode difficile opt-in multiplie difficulté et récompenses de fin (+20 %).

La récompense de rang part d'un plancher :

| Rang |  XP | Ryos | Chance carte | XP Battle Pass |
| ---- | --: | ---: | -----------: | -------------: |
| D    |  50 |  150 |         12 % |            100 |
| C    |  85 |  280 |         15 % |            160 |
| B    | 130 |  430 |         20 % |            250 |
| A    | 220 |  750 |         30 % |            400 |
| S    | 320 | 1100 |         35 % |            600 |

Le run applique ensuite son multiplicateur et un bonus progressif par combat gagné. La chance de carte finale est plafonnée à 85 %.

Une défaite, un abandon ou un combat abandonné ne paye pas la récompense de run.

## Factions et classement

Les factions sont cosmétiques et donnent seulement une identité visuelle. L'affectation est automatique si aucune faction n'est choisie. Un changement gratuit est autorisé.

Classements :

- niveau puis XP ;
- vue agrégée par faction.
