# Talent effect codes — combat

Catalogue des `effect_code` notables/keystones seedés dans `talentTreeNodes.js`, et de leur branchement dans le moteur (`deckCombat/talentEffects.js`).

Codes absents de `TALENT_EFFECT_MVP` → listés dans `combat.talentEffects.stubbed`.

## Actifs en combat (44)

| Code | Branche | Résumé moteur |
|------|---------|---------------|
| `iron_guard` | Tai | +3 Armure début de tour |
| `boosted_regen` | Med | +3 PV début de tour ; soins ×1.5 |
| `berserker` | Tai | <50 % PV : dégâts ×1.25 |
| `immortal` | Med | +2 % PV max/tour ; dégâts ×0.5 |
| `overload` | Nin | Nin : coût +1, dégâts ×2 |
| `intangible` | Gen | Pas d’attaque ; dégâts entrants plafonnés à 1 |
| `combo_master` | Tai | 3 Tai/tour → +2 Force (2 tours) |
| `blade_swift` | Tai | Tai coût ≤1 : +3 dégâts |
| `elemental_mastery` | Nin | Carte avec élément : dégâts ×1.25 |
| `elemental_fusion` | Nin | 2 éléments distincts/tour → pioche 1 |
| `shadow_feint` | Gen | 1ʳᵉ Gen du tour : coût −1 |
| `perfect_tank` | Med | <30 % PV : +5 Armure (1×/combat) |
| `counter_strike` | Tai | Après perte de PV : prochain Tai +4 |
| `finisher_blow` | Tai | Ennemi <25 % PV : Tai ×1.5 |
| `relentless_press` | Tai | Chaque Tai déjà joué ce tour : +1 dégât |
| `absolute_guard` | Tai | Armure ×2 ; Tai offensif coût +1 |
| `adrenaline_rush` | Tai | <50 % PV : +2 Vitesse combat (1×) |
| `crushing_grip` | Tai | Tai coût ≥3 : ignore 2 Armure |
| `chakra_surge` | Nin | Début combat : +1 Chakra |
| `storm_weave` | Nin | Après 2 Nin/tour : suivant coût −1 |
| `echo_cast` | Nin | 1ʳᵉ Nin combat : rejoue à 50 % dégâts |
| `elemental_cycle` | Nin | Alterner 2 éléments → +2 dégâts carte suivante |
| `void_channel` | Nin | Nin coût −1 ; −20 % PV max |
| `overcharge_spark` | Nin | Fin de tour à 0 Chakra → prochain Nin +3 |
| `focus_burn` | Nin | 1ʳᵉ Nin du tour : +4 dégâts |
| `dual_element` | Nin | Deck ≥2 éléments : Nin ×1.1 |
| `mana_well` | Nin | Tous les 3 tours : +1 Chakra |
| `illusion_master` | Gen | Débuffs Gen : durée +1 |
| `veil_thick` | Gen | +10 % esquive si ennemi sous débuff Gen |
| `mind_trap` | Gen | Attaque ennemie ≥3 : −1 dégât (min 1) |
| `echo_pain` | Gen | Quand vous perdez des PV : ennemi −1 PV (1×/tour) |
| `phantom_step` | Gen | Après esquive : pioche 1 (1×/combat) |
| `fear_seed` | Gen | 1ᵉʳ débuff Gen : ennemi Force −2 (2 tours) |
| `phantom_sovereign` | Gen | Débuffs Gen : intensité +1 ; pas d’Armure |
| `mirage_armor` | Gen | Début combat : +2 Armure illusoire (cassée au 1ᵉʳ coup) |
| `silent_cut` | Gen | Gen offensive en 1ʳᵉ carte du tour : +2 |
| `triage_focus` | Med | 1ᵉʳ soin combat : +5 |
| `purify` | Med | Début de tour : retire 1 débuff (1×/combat) |
| `blood_bond` | Med | Soin → +1 Armure (max 3/combat) |
| `field_surgeon` | Med | Soin coût ≥2 : +3 |
| `living_bastion` | Med | +40 PV max +2 Armure début ; soins ×0.7 |
| `last_stand_heal` | Med | <20 % PV : prochain soin ×2 (1×) |
| `vital_overflow` | Med | Surplus de soin → 50 % en Armure (max 3) |
| `item_master` | Centre | Objets → défausse (pas exhaust) ; hors-objet interdit |

## Reportés (1)

| Code | Raison |
|------|--------|
| `collector` | Bonus stats selon objets uniques du deck → couche stats / build, pas le moteur de résolution |

## Centre (objets / PV)

| Code | Effet combat |
|------|----------------|
| `item_armor` (nœud `path_weaver`) | Cartes Objet : +2 armure gagnée |
| `item_damage` (nœud `balanced_stance`) | Cartes Objet : +2 dégâts |
| `vital_satchel` (nœud `four_paths`) | +20 PV max (bonus talent) ; Objets : +1 dégât et +1 armure |

## Genjutsu / Médecine (rattrapage)

| Code | Effet |
|------|--------|
| `confusion_tax` | Attaques ennemies −2 si débuff Gen sur l’ennemi |
| `steady_hands` | +2 PV sur chaque soin |

## Hooks

- `applyTalentCombatStart` — début de combat
- `applyTalentStartOfTurn` / `applyTalentEndOfPlayerTurn` — tours
- `computeTalentDamageMods` — coût / dégâts / soins / armure par carte
- `applyTalentAfterCardPlay` — compteurs & flags
- `applyTalentAfterDamageTaken` / `applyTalentAfterHeal` — réactions
- `applyTalentToStatusPayload` — durée/intensité Gen
- `applyTalentIncomingAttackMods` — mind_trap / veil_thick
- `resolveCardPileDestination` — item_master
