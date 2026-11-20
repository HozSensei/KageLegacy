# Duel de decks asynchrone

Dans **Duel de decks**, un joueur affronte le deck actif d’un autre joueur, piloté par l’IA. Le propriétaire peut être déconnecté : il n’y a ni publication de deck ni autorisation de défense. Le PvP temps réel reste masqué et la coop ne change pas.

## Choisir un adversaire

| Mode                           | Sélection                                                                                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Défier un ami**              | Choisir un ami confirmé dans le lobby. Un clic sur **Défier** lance immédiatement le duel contre son deck piloté par l’IA, sans notification ni validation du défi. Pas de limite de niveau. |
| **Adversaire aléatoire**       | Le serveur sélectionne un autre joueur à **±3 niveaux**, quel que soit son village.                                                                                                          |
| **Adversaire faction ennemie** | Même fenêtre de niveau, mais les deux joueurs doivent appartenir à des villages différents.                                                                                                  |

Les deux joueurs doivent avoir un deck actif valide. La sélection automatique vérifie les decks des profils présélectionnés et n’élargit pas la fenêtre de niveau si elle ne trouve personne. Dans **Village → Amis**, la recherche, les demandes, les acceptations et les suppressions sont séparées des duels. Une demande en attente ne permet pas de défier le joueur. Pas de chat ni de stockage de messages.

## Déroulement

- Le serveur fige les deux decks, leurs améliorations, leurs passifs, les talents et l’appartenance aux villages au lancement. Un changement de deck ou de village n’affecte pas un duel en cours. Un seul duel par attaquant peut être ouvert à la fois ; il peut être repris après rechargement ou abandonné.
- Les deux camps utilisent les profils de cartes du solo : main persistante complétée à cinq, 5 chakra de base plus bonus, deux défausses volontaires dont une au plus pour le chakra. Le joueur commence. Terminer son tour déclenche celui de l’IA, résolu côté serveur.
- L’IA compare des séquences d’au plus trois actions payables, réévalue après chaque action et ne consulte ni la main adverse ni les futures cartes de sa pioche pour choisir. Cette version ne publie pas d’intention spéculative.
- L’état public contient la main du joueur, les informations visibles du défenseur et le journal de la dernière action. Il ne contient pas la main adverse, les piles ni l’aléa interne.

## Gains et classement des villages

Une victoire peut créditer **10 ryos provisoires au vainqueur**, en attaque comme en défense. Un abandon ne donne rien. Limites : **trois crédits par bénéficiaire et par jour UTC** et **un crédit par paire de joueurs par jour UTC**, même si les deux joueurs inversent leurs rôles. L’historique affiche les gains réellement versés pour les 20 dernières défenses terminées.

Un duel **aléatoire** ou **faction ennemie** terminé entre deux villages différents peut rapporter **1 point au village du vainqueur**. Les défis amicaux et les abandons ne comptent pas. Limites : **un point par paire par semaine** et **trois points par vainqueur et par jour UTC**. Les points et les ryos ont des quotas distincts.

Le classement se consulte dans **Village**. Une semaine commence le lundi à **00 h 00 UTC** et se clôt le dimanche à minuit, soit au lundi suivant à 00 h 00 UTC (borne exclusive). Le village seul en tête avec au moins un point remporte la semaine. Chaque joueur qui appartenait à ce village à l’ouverture reçoit automatiquement **50 ryos provisoires**, même s’il n’a joué aucun duel. Une affiliation ou un changement de village en cours de semaine ne modifie pas cette éligibilité. Une égalité en tête ou une semaine sans point ne donne aucun lot.

La page **Village** affiche les versements personnels confirmés. La cloche du header signale les gains non lus et ouvre leur section ; les ryos sont déjà crédités, sans action de réclamation. Sur mobile, les soldes sont accessibles via le bouton **Portefeuille**.

Le premier lot concerne la première semaine complète après l’installation ; les semaines d’observation ne sont pas payées rétroactivement. Le scheduler contrôle la clôture à minuit UTC et rattrape les semaines dues au démarrage. Chaque versement est enregistré et crédité une seule fois, dans la même transaction que la clôture. Le montant se règle dans `backend/src/config/economyConfig.js`.

## Architecture et déploiement

- `backend/src/routes/asyncDuels.js` : API HTTP authentifiée sous `/api/deck-duels`, sélection d’adversaires, amis, classement et actions. Seul l’attaquant peut lire son état de combat. Une révision périmée renvoie `409` ; le client recharge l’état sans rejouer l’action.
- `backend/src/services/deckCombat/asyncDuel.js` : état sérialisable, moteur déterministe, IA et projection publique. Les nouvelles versions doivent garder le format persisté lisible pour les combats déjà ouverts.
- `backend/src/services/asyncDuelRepository.js` : reprise, historique, registre de crédits et classement. La finalisation, le point et le crédit éventuels font partie de la même transaction. Les contraintes d’unicité et les verrous empêchent les doubles attributions. Les montants et plafonds doivent rester cohérents avec les contraintes du schéma.
- `backend/src/services/asyncDuelFriends.js` : relations stockées par paire de comptes. `frontend/src/views/CommunityView.vue` affiche le Village (`/village`, avec redirection depuis `/community`), ses amis et ses classements ; `frontend/src/views/DeckDuelsView.vue` utilise les relations confirmées dans le lobby et l’arène, sans WebSocket.

Sur une base existante, lancer `npm run db:migrate` pour appliquer la mise à jour additive propre au Duel de decks. Elle ajoute notamment l’historique d’affiliation, les clôtures et le registre des lots hebdomadaires, sans effacer l’historique ni modifier les soldes existants. Mettre à jour la base avant de redémarrer les services et suspendre les anciens écrivains pendant la bascule ; les changements de village doivent passer par l’application pour être enregistrés. Garder au moins un scheduler actif pour les versements. L’ancien réglage d’autorisation est conservé dans le schéma pour compatibilité mais n’est plus utilisé. Ne pas réinitialiser la base ni ressemer le catalogue.

Tests : `node --test backend/scripts/testAsyncDuel.js backend/scripts/testAsyncDuelRoutes.js` ; sur une base MySQL de test migrée, `npm run test:async-duel-repository --prefix backend`, `npm run test:weekly-village-payout --prefix backend` et `node --test backend/scripts/testAsyncDuelFriends.js`.
