# Règles du jeu (joueur)

Le contenu affiché dans l'interface (`/rules`) est maintenu ici :

- **FR** : [`frontend/src/content/rules.fr.md`](../frontend/src/content/rules.fr.md)
- **EN** : [`frontend/src/content/rules.en.md`](../frontend/src/content/rules.en.md)

## Structure

Une section par système du jeu actuel, dans cet ordre : En bref, Votre ninja, Les cartes, Le deck, L'arbre de talents, Le combat, Missions et parcours, La boutique, Le passe de saison, L'arène PvP, Monnaies et ressources, Historique des mises à jour.

Les titres de niveau 2 (`## `) forment le sommaire de la page. Les deux fichiers doivent garder la même structure et les mêmes chiffres. Les chiffres viennent du code (`backend/src/config/economyConfig.js`, `backend/src/services/`, `shared/pvp/`) : en cas de changement d'équilibrage, mettez à jour les deux langues.

Lors d'une mise à jour des règles, éditez ces fichiers (ils sont inclus dans le build Docker du frontend).
