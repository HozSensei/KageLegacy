# Boss multi-phases

Mécanique PvE pour les rencontres boss de **Kage Legacy V2** : seuils de PV qui basculent intents, buffs, immunités et barrières.

Code : `backend/src/services/deckCombat/bossPhases.js`, templates dans `enemyTemplates.js`, résolution IA dans `combatAIService.js`.

## Cycle

1. Le boss spawn en **phase de base** (`phaseIndex = -1`) avec le `pattern` / `patterns` du template.
2. Après chaque source de dégâts (cartes, allié, contre, DoT), `maybeAdvanceBossPhase` compare `hp / maxHp` aux seuils `phases[].hpPctBelow`.
3. Franchir un seuil (uniquement vers l’avant) applique `onEnter` puis remplace l’AI / le pattern, et **ré-annonce** l’intention.

Les phases **ne régressent jamais** si le boss se soigne.

## Schéma template

```js
{
  id: 'hollow_bell_warden',
  boss: true,
  rank: 'B',
  hp: 340,
  barrier: 22,
  immunities: [],
  ai: 'pattern',
  pattern: [ /* phase de base */ ],
  phases: [
    {
      id: 'cracked_bell',
      hpPctBelow: 0.55,
      onEnter: {
        barrier: 28,
        buffs: [{ status: 'force', value: 3, duration: 3 }],
        immunities: ['weak'],
        clearStatuses: false,
        setBlock: null,
      },
      ai: 'pattern',
      pattern: [ /* nouveaux intents */ ],
    },
  ],
}
```

| Champ `onEnter` | Effet |
|-----------------|--------|
| `barrier` | Fixe la barrière persistante |
| `buffs` | Applique des statuts (souvent `force`) |
| `immunities` | Ajoute des immunités (cumulatives) |
| `clearStatuses` | Purge les statuts du boss |
| `setBlock` | Pose de l’armure temporaire |

## Nouvelles mécaniques combat

### 1. Charge ennemie (`intent.type = 'charge'`)

- Tour N : l’ennemi **annonce** une charge (`releaseDamage`) — aucun dégât.
- Tour N+1 : intention forcée `{ type: 'attack', fromCharge: true, damage }` — libération.
- Logs : `charge` puis `damage` avec `fromCharge: true`.

### 2. Invocation ennemie (`intent.type = 'summon'`)

- Pose `enemy.minion` `{ hp, attack, taunt }` (taunt par défaut).
- Chaque tour ennemi, le minion frappe **avant** l’intention principale (`minion_attack`).
- Les coups joueur touchent d’abord le minion s’il a le taunt (`minion_damage`).

### 3. Shield break / barrière (`barrier` + `raise_barrier`)

- Ordre des dégâts entrants : **barrière → armure → PV**.
- La barrière **persiste** entre les tours (contrairement au block).
- Passer de `barrier > 0` à `0` déclenche `shield_break` et applique **vulnerable** (2 tours) au boss.
- Intent `raise_barrier` : empile de la barrière.

### Immunités

`enemy.immunities` bloque `apply_status` côté cartes (`status_immune`).

## Roster boss (noms originaux)

| ID | Nom FR | Rang | Phases | Signature |
|----|--------|------|--------|-----------|
| `hollow_bell_warden` | Gardien de la Cloche Creuse | B | 2 | Barrière + charge |
| `embercoil_matron` | Matrone Spiralebraise | B | 1 | Charge / burn |
| `grave_orchid_seer` | Voyante Orchidée-Tombe | A | 2 | Invocations |
| `mirrorfracture_colossus` | Colosse Fracturemire | A | 2 | Barrière + immunités |
| `voidspire_regent` | Régent de la Flèche-Vide | S | 3 | Mixte |

## Missions / runs

Migration `112_boss_phases_missions.sql` :

- Remplace les boss de fin des runs B/A existants.
- Ajoute : `toll-hollow-bell`, `embercoil-ascent`, `orchid-grave-vigil`, `fracturemire-siege`, `voidspire-regency` (S).

## Tests

```bash
npm run test:boss-phases --prefix backend
```

Les templates D–A « retune » existants ne sont **pas** modifiés (HP / intents inchangés pour `test:combat-balance`).
