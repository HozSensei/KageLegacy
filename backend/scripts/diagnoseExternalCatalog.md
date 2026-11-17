# Diagnostic de catalogue externe

Depuis la racine du dépôt :

```sh
node backend/scripts/diagnoseExternalCatalog.js "chemin/catalogue_v3.json" "chemin/cardExpansionV3.js"
node backend/scripts/testDiagnoseExternalCatalog.js
```

Le second argument est facultatif. Le script lit des objets JSON bruts destinés à `defineCard`, les normalise en mémoire, appelle `validateCatalog` et `assertOriginalNaming`, recherche les collisions avec `ALL_CARDS` et inventorie les types d'effets. Il ne modifie ni les seeds ni la base. La comparaison facultative vérifie l'égalité profonde et l'ordre du JSON et des objets du JS. Le JS n'est jamais exécuté : seul le format précis du livrable V3, avec objets JSON littéraux dans `defineCard`, est accepté.

Le résultat JSON contient les erreurs, avertissements et slugs concernés par chaque type d'effet. Code de sortie : 0 sans problème détecté, 1 en présence d'erreurs ou d'effets non reconnus, 2 si lecture ou analyse impossible.

L'inventaire des effets PvE est manuel et devra suivre `deckCombat/cardEffects.js` et `combatArts.js`. Un type reconnu ne garantit pas que ses paramètres, ses conditions, sa cible ou sa sémantique sont corrects, ni sa compatibilité PvP. `validateCatalog` reste lui-même partiel et `defineCard` fournit des valeurs par défaut : ce diagnostic n'est ni une validation exhaustive du schéma, ni une preuve d'équilibrage, de jouabilité, de validité des descriptions ou des illustrations. Les collisions sont comparées au catalogue seed en code, pas à une base existante ou à des fichiers non intégrés. Aucun effet nouveau n'est implémenté par cet outil.
