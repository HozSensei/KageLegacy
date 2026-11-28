# Kagekuni — Acquisition et SEO

## Fonctionnement commun
Ce document est la source de référence pour les décisions produit et marketing discutées avec ChatGPT et leur transmission à Codex. Lire AGENTS.md avant toute intervention. Codex doit consulter ce document depuis la branche à jour, traiter uniquement les demandes marquées VALIDÉ, respecter les dépendances et signaler les blocages. Après réalisation, documenter les fichiers modifiés, tests, résultats et limites dans le suivi ci-dessous. Ne pas considérer les propositions comme des autorisations d'implémentation. Pas de déploiement ni de fusion sans accord du propriétaire.

## Contexte et objectifs
Kagekuni (anciennement KageLegacy), https://kagekuni.com/home, est un TCG ninja indépendant par navigateur, bilingue FR/EN, combinant collection, decks, missions à embranchements, progression RPG, coopération et duels asynchrones. Voir README.md et GAME_RULES.md pour les règles actuelles ; vérifier le code plutôt que supposer que toute la documentation est à jour.
La monétisation est temporairement indisponible ; conserver la possibilité d'un wipe. Priorité : attirer de vrais joueurs et mesurer leur activation et leur fidélisation, sans ajouter inutilement de mécaniques.

## Stratégie
- Positionnement à tester : ninja card RPG, tactical deck-building, roguelite missions, asynchronous multiplayer.
- Audiences : TCG, roguelites, RPG ninja, joueurs de navigateur.
- Reddit non prioritaire (barrières de participation). Annuaires secondaires, audience non vérifiée. Micro-créateurs, vidéos courtes de gameplay et SEO à explorer ; publicité expérimentale seulement après décision sur le budget.
- Exploiter les comptes invités et la coopération existants ; vérifier le parcours réel.
- Ne pas promettre de contenu ou fonctionnalités non disponibles en production.

## Demandes et roadmap

### ACQ-001 — Audit SEO et conversion
Statut : VALIDÉ — analyse uniquement, aucune modification applicative avant validation du plan.
Analyser les pages publiques, landing actuelle, router Vue, i18n, URLs, HTML indexable, Vite, Docker, Nginx, title/description, canonical, hreflang, Open Graph, robots.txt, sitemap, données structurées, performances et accessibilité mobile, parcours invité/inscription, instrumentation existante. Comparer prérendu statique et SSR en privilégiant une solution légère compatible avec l'architecture existante.
Livrable : état réel, lacunes, plan priorisé, fichiers concernés, risques, tests et critères d'acceptation. Distinguer ce qui est vérifié dans le code de ce qui nécessite une vérification en production. Ne pas modifier le code avant accord.

### ACQ-002 — Socle SEO
Statut : PROPOSITION — en attente de l'audit et de validation.
Métadonnées centralisées par page et langue, URLs localisées, canonical/hreflang, sitemap, robots, partage social, données structurées pertinentes, rendu indexable et séparation pages publiques/privées.

### ACQ-003 — Landing pages thématiques
Statut : PROPOSITION.
Évaluer Ninja Trading Card Game, Online Ninja RPG, Roguelite Card Game, Multiplayer Card RPG. Contenu FR/EN réellement distinct et utile, assets du jeu, CTA vers parcours invité ou inscription. Éviter les pages dupliquées ou artificielles. Mots-clés et demande à valider.

### ACQ-004 — Catalogue public
Statut : PROPOSITION.
Évaluer des pages de cartes indexables alimentées par le catalogue existant, sans exposer de données privées.

### ACQ-005 — Acquisition et mesure
Statut : PROPOSITION.
UTM, mesure visiteurs/invités/inscrits, activation, rétention, partage de cartes/decks, liens d'invitation coopératifs. Respecter la confidentialité et les exigences de consentement applicables.

## Contraintes transversales
Respecter AGENTS.md, design actuel, composants et assets existants, FR/EN, mobile et desktop, routes existantes. Ne pas changer le gameplay ni activer la monétisation. Éviter les dépendances et refactorings disproportionnés. Implémentations sur branche dédiée avec PR et tests ; ne pas fusionner ni déployer sans accord.

## Suivi
- Initialisation : ACQ-001 prête pour audit ; ACQ-002 à ACQ-005 non validées. Aucun changement applicatif effectué.
- Codex : ajouter ici les résultats d'audit ou un lien vers leur document/PR, puis les résultats d'implémentation et tests pour chaque demande validée.
