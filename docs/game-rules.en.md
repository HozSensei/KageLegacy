# Game rules (player)

Content shown in the UI (`/rules`) is maintained here:

- **FR**: [`frontend/src/content/rules.fr.md`](../frontend/src/content/rules.fr.md)
- **EN**: [`frontend/src/content/rules.en.md`](../frontend/src/content/rules.en.md)

## Structure

One section per system of the current game, in this order: At a glance, Your ninja, Cards, The deck, The talent tree, Combat, Missions and runs, The shop, The season pass, The PvP arena, Currencies and resources, Update history.

Level-2 headings (`## `) build the page's table of contents. Avoid apostrophes in those headings: the generated anchor would no longer match the table-of-contents link. Both files must keep the same structure and the same numbers. The numbers come from the code (`backend/src/config/economyConfig.js`, `backend/src/services/`, `shared/pvp/`): when balance changes, update both languages.

When updating rules, edit those files (they are included in the frontend Docker build).
