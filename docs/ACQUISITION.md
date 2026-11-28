# Kagekuni — Acquisition et SEO

## Fonctionnement commun
Ce document est la source de référence pour les décisions produit et marketing discutées avec ChatGPT et leur transmission à Codex. Lire AGENTS.md avant toute intervention. Codex doit consulter ce document depuis la branche à jour, traiter uniquement les demandes marquées VALIDÉ, respecter les dépendances et signaler les blocages. Après réalisation, documenter les fichiers modifiés, tests, résultats et limites dans le suivi ci-dessous. Ne pas considérer les propositions comme des autorisations d'implémentation. Pas de déploiement ni de fusion sans accord du propriétaire.

## Contexte et objectifs
Kagekuni (anciennement KageLegacy), https://kagekuni.com/, est un TCG ninja indépendant par navigateur, bilingue FR/EN, combinant collection, decks, missions à embranchements, progression RPG, coopération et duels asynchrones. Voir README.md et GAME_RULES.md pour les règles actuelles ; vérifier le code plutôt que supposer que toute la documentation est à jour.
La monétisation est temporairement indisponible ; conserver la possibilité d'un wipe. Priorité : attirer de vrais joueurs et mesurer leur activation et leur fidélisation, sans ajouter inutilement de mécaniques.

## Stratégie
- Positionnement à tester : ninja card RPG, tactical deck-building, roguelite missions, asynchronous multiplayer.
- Audiences : TCG, roguelites, RPG ninja, joueurs de navigateur.
- Reddit non prioritaire (barrières de participation). Annuaires secondaires, audience non vérifiée. Micro-créateurs, vidéos courtes de gameplay et SEO à explorer ; publicité expérimentale seulement après décision sur le budget.
- Exploiter les comptes invités et la coopération existants ; vérifier le parcours réel.
- Ne pas promettre de contenu ou fonctionnalités non disponibles en production.

## Demandes et roadmap

### ACQ-001 — Audit SEO et conversion
Statut : TERMINÉ — audit approuvé, PR #314 fusionnée.
Analyser les pages publiques, landing actuelle, router Vue, i18n, URLs, HTML indexable, Vite, Docker, Nginx, title/description, canonical, hreflang, Open Graph, robots.txt, sitemap, données structurées, performances et accessibilité mobile, parcours invité/inscription, instrumentation existante. Comparer prérendu statique et SSR en privilégiant une solution légère compatible avec l'architecture existante.
Livrable : état réel, lacunes, plan priorisé, fichiers concernés, risques, tests et critères d'acceptation. Distinguer ce qui est vérifié dans le code de ce qui nécessite une vérification en production. Ne pas modifier le code avant accord.

### ACQ-002 — Socle SEO
Statut : VALIDÉ — implémentation autorisée par le propriétaire le 28 novembre 2026.

Appliquer le plan de [ACQ-001-AUDIT.md](ACQ-001-AUDIT.md), avec les décisions suivantes qui priment sur ses propositions d'URL.

**P0 — Rendu et URL**
- Prérendu statique au build Vite des accueils et règles FR/EN, sans migration Nuxt ni SSR à la requête. HTML complet sans JS ni dépendance à la session ou à l'API ; source commune pour contenu et métadonnées.
- URL canoniques symétriques : /fr/, /en/, /fr/regles, /en/rules. Langue déterminée par l'URL publique, attribut html lang correct, sélecteur de langue avec liens équivalents. Préserver les ancres des règles.
- Racine / : point d'entrée international stable ; choisir et documenter une politique simple de redirection et x-default cohérente (par défaut français, sans redirection forcée des URL localisées). /rules redirige en 301 vers /fr/regles. Préserver les paramètres utiles et éviter les boucles. Ne pas modifier le comportement authentifié de /home ni les routes privées.
- Titres et descriptions uniques FR/EN, canonical absolu auto-référent, hreflang réciproques, Open Graph et images de partage existantes adaptées. Évaluer JSON-LD VideoGame conforme au contenu visible, sans inventer de faits.
- Sitemap XML des seules URL canoniques indexables et vrai robots.txt avec lien sitemap. Accueil et règles indexables ; login, register, legal, pages privées et administration noindex, sans bloquer l'exploration nécessaire à la lecture de la directive. Ne pas confondre noindex et contrôle d'accès.
- Nginx : vrais 404 pour chemins inconnus et assets absents ; conserver les routes SPA légitimes au rechargement et les comportements API/WebSocket existants.

**P1 — Performance et parcours**
- Lazy loading des vues privées, réduire le coût JS public et découpler le premier affichage public de la requête de session sans casser les redirections. Préserver le design et les CTA actuels. Vérifier accessibilité mobile dès 320 px, clavier, focus du menu et mouvement réduit.
- Tester le parcours invité, inscription, session, expiration et conversion en environnement isolé, FR/EN ; aucun compte de test en production. Pas d'instrumentation analytics à ce stade (ACQ-005 séparée).

**Validation**
- Build et tests existants, tests HTTP sur l'image/configuration de production locale : HTML sans JS, statut, langue, métadonnées, liens/ancres, redirections, sitemap/robots, 404, routes privées et API. Vérifier les images de partage et la cohérence du rendu après bootstrap.
- Comparer poids JS et mesures synthétiques à protocole identique ; ne pas présenter ces mesures comme des données terrain. Documenter les tests réellement exécutés, les limites et les vérifications post-déploiement (Search Console, indexation, partage).
- Branche dédiée et PR ; mettre à jour le suivi. Aucun déploiement ni fusion sans accord. ACQ-003 à ACQ-005 hors périmètre.

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
- 28 novembre 2026 — **ACQ-001, audit réalisé.** [Rapport et plan priorisé](ACQ-001-AUDIT.md). La landing publique est `/`. En production, le HTML brut ne contient aucun contenu de page et les URL robots/sitemap renvoient le shell SPA. Le rapport recommande le prérendu statique des pages publiques FR/EN.
- **Tests ACQ-001** — Build Vite réussi, sondages HTTP en production, vérification Chromium sur mobile émulé et desktop, contrôle axe sur la landing FR et parcours invité jusqu’au wizard avec API simulée.
- **Vérifications restantes** — Création effective de compte et suite de l’onboarding sur environnement isolé, mesures de terrain, données de conversion et état d’indexation dans Search Console. Le plan dépend de la validation du propriétaire.
- **Fichiers** — `docs/ACQUISITION.md` et `docs/ACQ-001-AUDIT.md`. À la clôture de l'audit, ACQ-002 à ACQ-005 étaient au stade de proposition.

- 28 novembre 2026 — PR #314 fusionnée, ACQ-001 approuvée. ACQ-002 validée avec structure symétrique /fr/ et /en/. ACQ-003 à ACQ-005 restent des propositions.
