# Économie — Kage Legacy

Source de vérité : [`backend/src/config/economyConfig.js`](../backend/src/config/economyConfig.js). Modifier les montants dans cette configuration, puis exécuter les tests économiques disponibles.

## Objectifs

- Permettre la progression gratuite par les missions, les cartes obtenues et le Battle Pass gratuit.
- Réserver les Kage Coins aux packs premium, au Battle Pass premium et aux niveaux de Battle Pass.
- Utiliser Ryos, poussière et essence comme ressources d'amélioration et de collection, sans craft de carte.

## Monnaies

| Monnaie    | Sources                                    | Dépenses actives                                             |
| ---------- | ------------------------------------------ | ------------------------------------------------------------ |
| Ryos       | Missions et Battle Pass                    | Boosters standard/élémentaires, améliorations                |
| Poussière  | Désenchantement et Battle Pass             | Améliorations                                                |
| Essence    | Désenchantement haut niveau et Battle Pass | Améliorations haut niveau                                    |
| Kage Coins | Packs achetés et Battle Pass               | Booster premium, Battle Pass premium, niveaux de Battle Pass |

## Boosters

| Type        |           Coût |
| ----------- | -------------: |
| Standard    |       400 Ryos |
| Élémentaire |       650 Ryos |
| Premium     | 100 Kage Coins |

Les taux de rareté sont définis par le service de boosters. Les récompenses de combat par rang sont définies par `COMBAT_REWARDS_BY_RANK` dans la configuration économique.

## Amélioration des cartes

Une carte peut monter de Base à `+`, puis `++`; les mythiques s'arrêtent à `+`. Les coûts et les ressources exigées dépendent de la rareté et sont définis dans `UPGRADE_COSTS`. Le désenchantement transforme les copies en ressources selon `DISENCHANT_DUST`.

Le craft de cartes n'est pas une fonctionnalité du produit actuel.

## Battle Pass

Les constantes du Battle Pass — coût premium, coût des niveaux, bonus d'XP et plafonds — sont regroupées dans `BATTLE_PASS`. Les récompenses saisonnières doivent rester limitées aux monnaies, cartes et boosters effectivement pris en charge par le backend.
