# Kagekuni — Game rules

**Kagekuni** is a solo deck-building game set in a ninja world. You play **a single ninja**. Their power comes from two sources only: the **cards in your deck** and your **talent tree**. You fight enemies in **turn-based** combat, mission after mission, and you can challenge other players in the arena.

This guide describes the game as it works today. The numbers given are the ones the game applies.

_Last updated: 22 November 2026_

---

## The world

Three villages — **Midorihara**, **Kareno**, **Oborohama** — fight over prestige and the title of Kage. An old **pact** between them was betrayed: murder, theft, lies. No one confesses. Official peace hides a **cold war**.

You serve **your village**. Missions are operations (roads, agents, proof). Inter-village duels feed a weekly prestige standing. Your village grants **no combat bonus**.

---

## At a glance

1. **Create your ninja**: choose a name and an Aspirant portrait.
2. **Receive your starter deck**: 22 cards, ready to play.
3. **Start a mission**: stake a purse, then advance on a branched path (shop, fork, fights).
4. **Earn experience**: each level gives 1 talent point.
5. **Grow stronger**: spend your points in the tree, open scrolls, upgrade your cards, tune your deck.

Nothing grows on its own: levelling up gives **no stats**, only a talent point to place.

---

## Your ninja

### Creation

Each account or guest has **a single ninja**. When you sign up or start as a guest, choose a **name** (at least 2 characters) and an **Aspirant portrait**. If you don't change the portrait, the first Aspirant portrait is used. Your ninja is automatically assigned a village.

Your ninja starts at **level 1**, at the rank of **Aspirant ninja**, with **1 talent point** and a starter deck.

### Level and rank

Victories grant experience (XP). Going from level _N_ to the next one takes **100 × N** XP: 100 XP to reach level 2, 200 XP for level 3, and so on. The maximum level is **80**.

Each level gained gives **1 talent point** but no stats.

Rank follows level:

| Level    | Rank           | Nickname unlocked |
| -------- | -------------- | ----------------- |
| 1 to 4   | Aspirant ninja | —                 |
| 5 to 19  | Genin          | Rising Shinobi    |
| 20 to 39 | Chunin         | Field Veteran     |
| 40 to 59 | Jonin          | Shinobi Elite     |
| 60 to 79 | ANBU           | Silent Blade      |
| 80       | Kage           | Village Legend    |

### Profile cosmetics

In your profile, you can change your **portrait**, choose an illustrated **card background**, and equip an unlocked **nickname**. Portrait collections unlock at their matching rank, from Aspirant through ANBU. You keep access to portraits from lower ranks; Kage can use all collections and has no separate portrait collection.

Each promotion from Genin to Kage unlocks the nickname listed above. Earned nicknames stay available even if your level is reset. Ranks and cosmetics do not grant combat bonuses.

### Stats

Your ninja has **no base stats**. Their stats are the sum of two things:

- bonuses from unlocked **talents**;
- **passive bonuses** from the cards in your **active deck**.

The profile shows the breakdown of both sources.

| Stat               | Effect in combat                                              |
| ------------------ | ------------------------------------------------------------- |
| **Taijutsu**       | Increases the damage of Taijutsu cards                        |
| **Ninjutsu**       | Increases the damage of Ninjutsu cards                        |
| **Genjutsu**       | Increases the damage of Genjutsu cards                        |
| **Medicine**       | Increases armor and healing, and the damage of Medicine cards |
| **Max HP**         | Added to the 100 starting hit points                          |
| **Max Chakra**     | Increases the Chakra received at the start of each turn       |
| **Starting Armor** | Adds block at the start of combat                             |

Each point of Taijutsu, Ninjutsu, Genjutsu or Medicine is worth **+1%**: with 30 Ninjutsu, a Ninjutsu card with 10 damage deals 13.

---

## Cards

Every card plays two roles:

- an **active effect**, when you play it in combat;
- a **passive bonus**, added to your stats for as long as the card is in your active deck, even if you never draw it.

### Card types

| Type        | Role                                                  |
| ----------- | ----------------------------------------------------- |
| **Attack**  | Deals damage, sometimes with a status                 |
| **Defense** | Grants armor                                          |
| **Skill**   | Heals, draws cards, restores Chakra, applies statuses |
| **Summon**  | Calls an ally who fights at your side                 |
| **Item**    | One-off effect; most are exhausted after use          |

A card can be tied to a **path** (Taijutsu, Ninjutsu, Genjutsu, Medicine) and to an **element** (Katon, Suiton, Raiton, Doton, Futon). Cards with no path (items, summons, some heritages) are **neutral**: they do not count toward the deck’s path floors (15 + 5) and **break** a chain.

### Common active effects

Each card shows **its own text** in the collection and in combat. These are the effect types you may see:

| Effect | What it does |
| ------ | ------------ |
| **Damage / Armor / Healing** | Main figures, boosted by the path stat (or the best path for a neutral card) |
| **Multi-hit** | Several strikes; one critical roll for the whole card |
| **Status** | Applies a status (see “Statuses”) |
| **Draw / Chakra** | Draws cards or restores Chakra |
| **After [path]** | Bonus if the previous card matches the listed path |
| **Next card −N Chakra** | Reduces the cost of the next successfully played card |
| **Evade** | Chance to cancel the next attack taken |
| **Counter** | Deals damage to the attacker after you are hit |
| **Cleanse** | Removes harmful statuses |
| **Exhaust** | Removes the card from the fight after use |
| **Bonus if…** | Extra damage when a condition is true (e.g. enemy Vulnerable, first card of the turn) |

Exact numbers are always those written on the card.

### Heritages (held effects)

Some clan legendary cards carry a **heritage**: an effect that applies **while the card is in hand**. Playing the card does not grant its own heritage to itself.

| Heritage | Effect |
| -------- | ------ |
| **Shizumori** | +15% evade |
| **Benigiri** | +20% Ninjutsu damage |
| **Kazamine** | +20% Taijutsu damage |
| **Kumatani** | +6 armor at the start of your turn |
| **Yukisawa** | +2 Chakra at the start of your turn |
| **Nagihara** | +20% healing |

Heritage Chakra and armor are granted **once** at the start of your turn. Percentage bonuses apply while the card stays in hand. The same copy counted twice still contributes only once. Heritage evade is capped at **75%**.

### Rarities

Four rarities: **Normal**, **Rare**, **Legendary**, **Mythic**. (Normal rarity is unrelated to neutral-path cards.)

### Cost and exhaust

Playing a card costs **Chakra** (from 0 to several points). A card marked **Exhaust** is removed from the fight after being played. Summons always are.

### Upgrading

From the Collection, a card can be upgraded twice: level **+**, then level **++**. A mythic card stops at level +. Upgrading strengthens both the active effect and the passive bonus.

| Rarity    | Level +                             | Level ++                            |
| --------- | ----------------------------------- | ----------------------------------- |
| Normal    | 300 Ryos, 15 dust                   | 1,500 Ryos, 80 dust                 |
| Rare      | 1,200 Ryos, 80 dust                 | 5,000 Ryos, 400 dust                |
| Legendary | 4,500 Ryos, 400 dust                | 18,000 Ryos, 1,800 dust, 10 essence |
| Mythic    | 18,000 Ryos, 1,800 dust, 20 essence | —                                   |

### Disenchanting

You can destroy one copy of a card to get **card dust**:

| Rarity    | Dust gained |
| --------- | ----------- |
| Normal    | 10          |
| Rare      | 40          |
| Legendary | 200         |
| Mythic    | 1,000       |

An upgraded legendary card also returns 2 essence, an upgraded mythic card 5 essence. A copy used in a deck cannot be disenchanted.

### Getting cards

- the **starter deck**, granted at creation;
- **scrolls** from the shop;
- a **card chance** at the end of missions;
- **season pass** rewards.

---

## The deck

A playable deck holds **20 to 30 cards**, with **at most 3 copies** of the same card. You can only include copies you own. Two further limits apply: **3 legendary or mythic cards combined**, including **at most 1 clan card**. Legendary or mythic clan copies count toward both limits.

The deck must contain **at least 15 cards of one path** and **at least 5 cards of a second path**. The rest is free: 3rd or 4th path, neutrals, and so on. Only each card's primary art counts; neutrals do not fill the 15 and 5 floors. On creation, two starter decks are offered (Taijutsu and Ninjutsu).

You can build several decks, but only one is **active**. The active deck is the one that:

- is played in missions and in the arena;
- provides the passive bonuses counted in your stats.

Building a deck therefore means deciding twice: what you want to **draw**, and what you want to **carry** for its passive bonuses. Thirty cards give more passive bonuses than twenty, but you will draw your best cards less often.

---

## The talent tree

The tree has **150 nodes** split between a **center** and four branches: **Taijutsu**, **Ninjutsu**, **Genjutsu** and **Medicine**.

- Unlocking a node costs **1 talent point**.
- A node is only available once its **prerequisites** are unlocked: you progress step by step from the center.
- With 1 point at the start and 1 point per level, you will never unlock the whole tree: you have to choose.

Three kinds of nodes:

| Node         | What it gives                                                  |
| ------------ | -------------------------------------------------------------- |
| **Stat**     | A stat bonus                                                   |
| **Notable**  | A stat bonus and a special effect                              |
| **Keystone** | A powerful effect paired with a drawback. There are 10 of them |

Each node's effect is described in the tree when you select it.

### Reset

You can reset the whole tree: every point spent is returned to you. You get **one free reset per 10 levels** reached. Beyond that, a reset costs **2,000 Ryos**.

---

## Combat

In PvE, a fight pits your ninja against one enemy, turn by turn. You always play first. **Persistent hands** are the default in missions and quick duels.

### Setup

- You have **100 HP**, plus your max HP bonus.
- Your deck is shuffled and becomes your **draw pile**.
- You draw **5 cards**.
- The enemy **announces its current intent**, which it will carry out on its next turn. When available, the **following intent** previews the type of action planned for the enemy turn after that, without numbers.

### Your turn

- Your Chakra refills to its maximum at the start of your turn. Unspent Chakra **does not carry over**. Cards and talents can modify your resources.
- You play as many cards as your Chakra allows, in any order.
- You can discard **up to 2 cards per turn**. Each discard lets you draw another card if one is available, or gain **1 Chakra**. You can gain Chakra this way **once per turn**, and it counts toward the same limit.
- You end your turn whenever you want.

Select a card and use the buttons to play or discard it; you can also drag it to the corresponding zone.

Unplayed cards **stay in your hand**: there is no reserve. At the start of your next turn, you draw until you have **5 cards** in hand. If you already have 5 or more, you keep them without drawing at this step.

Some cards display a combat role. This label describes the card without recommending what to play.

Your hand is limited to **10 cards**. When the draw pile is empty, the discard pile is shuffled and becomes the draw pile again.

### After [path] (chain effects)

Some cards carry text like “After Taijutsu: +2 damage.” This is **not** an automatic bonus from path order: only the card that writes it can trigger it.

- Only the **immediately previous card** in the **same turn** is checked.
- That previous card must belong to one of the four paths (Taijutsu, Ninjutsu, Genjutsu, Medicine).
- A **neutral** card (item, summon, etc.) **breaks** the chain.
- At the start of your turn, the chain is **reset**.
- A refused play (not enough Chakra, etc.) does not change the chain.

Possible rewards, depending on the card: damage, healing, Armor, effect intensity, draw, Chakra, or next-card cost reduction. A card without “After [path]” text receives no chain bonus.

### Next-card cost reduction

Some cards (or chain rewards) say “Next card: −N Chakra.”

- Reductions **stack**.
- When you **successfully** play a card, its cost is reduced to a minimum of 0, then **all** stacked reduction is consumed — even if the card cost 0, even if you did not use every point.
- If you play no further card, the reduction **carries to the next turn**.
- A refused play does not consume the reduction.

### The enemy's turn

The enemy carries out its current intent, then the displayed intents are updated:

| Intent             | Effect                                     |
| ------------------ | ------------------------------------------ |
| **Attack**         | Deals the damage shown                     |
| **Defend**         | The enemy gains armor                      |
| **Buff**           | The enemy gives itself a beneficial status |
| **Debuff**         | The enemy inflicts a harmful status on you |
| **Special action** | Charge, summon or barrier (see Bosses)     |

### Damage, armor and healing

- **Card damage**: base damage, increased by 1% per point in the stat of its path (best path for a neutral card).
- **Armor**: it absorbs damage before your HP. It protects you during the enemy's turn. At the start of your next turn, leftover armor is halved (rounded down); a single remaining point fades away. The enemy's armor decays the same way at the start of its turn.
- **Healing**: it cannot exceed your max HP.
- **Critical hit**: some cards or their keywords grant a critical chance, capped at 50%. A critical hit applies **×1.5** to damage; Speed does not determine this chance. On a multi-hit card, one critical roll applies to every hit.

### Damage resolution order

When an attack card resolves, the game applies modifiers in this order:

1. base damage and flat talent bonuses;
2. conditional (“if…”) bonuses and “After [path]” bonuses;
3. path scaling (+1% per point);
4. active heritage bonus for that path, if any;
5. Strength (adds its value to each hit);
6. path advantage, elemental advantage, and outgoing status penalties (e.g. Weak);
7. talent multipliers;
8. critical hit (×1.5);
9. Vulnerable on the target (+50% damage taken);
10. absorption: Taunt ally, then barrier, then armor, then HP.

### Path and element advantages

Each enemy has a **stance** (Taijutsu, Ninjutsu or Genjutsu) and sometimes an **elemental affinity**.

**Paths** — an attack from an advantaged path deals **×1.2** damage:

- Taijutsu beats Genjutsu;
- Genjutsu beats Ninjutsu;
- Ninjutsu beats Taijutsu.

The reverse matchup applies a **×0.9** disadvantage. Medicine is always neutral.

**Elements** — a card whose element beats the enemy's affinity deals **×1.5** damage. The other way round, it only deals **×0.7**:

- Katon beats Futon;
- Futon beats Raiton;
- Raiton beats Doton;
- Doton beats Suiton;
- Suiton beats Katon.

A card with no element, or an enemy with no affinity, stays neutral.

### Statuses

| Status | Effect |
| ------ | ------ |
| **Strength** | Adds its value to the damage of each hit |
| **Dexterity** | Adds its value to the armor gained per card |
| **Regeneration** | Restores its value in HP at the start of the turn |
| **Bleed** | Taijutsu — deals its intensity in HP at the start of the turn (ignores armor) |
| **Burn** | Ninjutsu — deals its intensity in HP at the start of the turn (ignores armor) |
| **Poison** | Medicine — deals its intensity in HP at the start of the turn (ignores armor) |
| **Madness** | Genjutsu — deals its intensity in HP at the start of the turn (ignores armor) |
| **Weak** | Damage dealt reduced by 25% |
| **Vulnerable** | Damage taken increased by 50% |
| **Intangible** | Incoming attacks deal only 1 damage |
| **Evade** | Chance to cancel the next attack taken; then evade is consumed |
| **Counter** | After being hit, deals its damage value to the attacker, then disappears |
| **% bonuses** (damage, armor, healing, paths) | Multiply the relevant figure while the status lasts |

**How is DoT intensity calculated?** The card (or summon / intent) only chooses **duration** (1 or 2 turns). Intensity comes from the engine:

`base + round(path_stat × 0.09) + talents`

Bases: Bleed 8, Burn 5, Poison 4, Madness 4. Example: Burn with 40 Ninjutsu → `5 + round(3.6) = 9` HP/turn. A path only applies its own DoT (Taijutsu → bleed, etc.). Reapplying the **same** DoT **adds** durations and **does not** change the intensity already applied. Each talent tree can add +2 to its DoT intensity. A DoT’s duration is the **number of ticks** left: it drops after the start-of-turn tick.

**Weak** and **Vulnerable** have no intensity: only duration matters. Reapplying them **adds** durations (like a DoT); the multiplier stays unique (−25% / +50%). Other non-DoT statuses applied again **stack** their value and keep the longer duration. Their limited durations drop by 1 at the end of the affected combatant's turn. Evade and Counter are usually **consumed** when they trigger.

### Summons

A Summon card calls an **ally**. You can only have **one** at a time: a new summon replaces the previous one.

- At the start of each of your turns, the ally **attacks the enemy automatically**.
- An ally with **Taunt** takes enemy attacks in your place for as long as it has HP left.
- An ally with **Regeneration** heals you at the start of your turn (utility ally).
- An ally with **Evade** increases your chance to dodge attacks while it is alive.
- An ally with **Burn** applies Burn (engine intensity, 2 turns) to the enemy on every strike; reapplying extends duration.
- An ally with **Strike** deals **+25%** attack damage.

### End of the fight

- **Victory**: the enemy's HP drops to 0.
- **Defeat**: your HP drops to 0.
- **Forfeit**: you can forfeit at any time. A forfeit counts as a defeat.

### Bosses

Bosses close the runs of rank B, A and S. They have mechanics of their own:

- **Phases**: when its HP falls below a threshold, the boss changes behaviour. It can buff itself, raise a barrier or become immune to some statuses. A phase that has been crossed never reverts.
- **Barrier**: it absorbs damage before armor and does not disappear from one turn to the next. Breaking a barrier makes the boss **Vulnerable** for 2 turns.
- **Charge**: the boss announces a charge and deals nothing that turn. On the next turn, it releases a heavy attack. You have one turn to prepare.
- **Minion**: a boss can summon a minion. The minion strikes before the boss on every enemy turn, and your attacks hit it first.
- **Immunities**: some statuses cannot be applied to some bosses.

---

## Missions and runs

### Ranks

Missions come in five ranks, from easiest to hardest: **D**, **C**, **B**, **A**, **S**. One active mission per rank; each launch rolls a different path. Access depends on your **character rank** (cumulative):

| Character rank | Missions unlocked |
| -------------- | ----------------- |
| Aspirant ninja / Genin | **D** and **C** |
| Chunin / Jonin | **D**, **C**, **B**, **A** |
| ANBU / Kage | all ranks, including **S** |

Rank **D** is demanding with the starter deck. Rank **C** is nearly unreachable without some levels, talents, and cards earned by farming D.

| Rank | Entries | Fights (short / long) | Shop | Fork | Final boss |
| ---- | ------- | --------------------- | ---- | ---- | ---------- |
| D    | 1       | 3 / 4                 | Yes  | Yes  | No         |
| C    | 1       | 3 / 4                 | Yes  | Yes  | No         |
| B    | 1       | 4 / 5                 | Yes  | Yes  | Yes        |
| A    | 1       | 4 / 6                 | Yes  | Yes  | Yes        |
| S    | 1       | 5 / 6                 | Yes  | Yes  | Yes        |

### Staked purse

Before launching, you choose a **purse** of **0, 100, 200, or 300 Ryos**. That amount is **taken** from your account and becomes the run purse.

- **Road gains** (+25 per cleared node, +50 per fight won) add to this purse.
- You spend the purse at the **peddler** (heals, seals, sealed scrolls).
- On **victory**, the remaining purse returns as Ryos with end rewards.
- On **defeat** or **abandon**, the purse and mission inventory are **lost**.

### The run

Starting a mission opens a **branched path**: opening fight, shop, crossroads (short or long route), then finale. The immersive briefing appears at launch, not on the mission list.

- Your **HP does not come back** between fights (except a halt or items used out of combat).
- At the crossroads, the **long route** pays **+35% XP** at the end; the short one keeps ×1.
- A **defeat** or a **forfeit** fails the whole run: no completion reward, purse lost.
- You can only have **one run in progress**. You can leave it and resume it later, or abandon it.
- Before launching, you can tick **Increased difficulty**: tougher enemies (+20%), end-of-run rewards +20%.

### Inventory and mission shop

The **mission inventory** has **4 slots**. Buying does not use the item: you must use it out of combat (heals, boosts) or discard it to free a slot.

| Purchase type | Effect |
| ------------- | ------ |
| **Heals** (bandage, tonic, elixir) | Heal 25% / 50% / 75% of max HP, out of combat only |
| **Run seal** | Damage bonus for the rest of the run |
| **Next-fight talismans** | Block, chakra, or damage consumed on the next fight |
| **Sealed scrolls** | Card (common / rare / legendary) revealed **only at the end** |

A **halt** heals for free outside inventory. Non-sealed leftover items do not carry outside the run.

### Rewards

Rewards are paid out **at the end of the run**, once the last fight is won:

- **XP** for your ninja (×1 or ×1.35 depending on the branch);
- reward **Ryos** **plus** the remaining purse;
- **season pass XP**;
- a **chance to get a card**, common or rare, plus any **sealed scrolls** bought along the way.

Each mission shows its base rewards. They are multiplied by a **run bonus**, from ×1.6 at rank D up to ×3 at rank S, plus 8% per fight won beyond the first.

### Quick duel

A quick duel starts a single fight against the enemy of your choice, outside any run. Victory immediately pays a fixed reward: 40 XP, 100 Ryos, a 12% card chance and 50 season pass XP.

### PvP duels (frozen deck)

In **PvP duels**, you face another player’s **active deck**, frozen at launch and **driven by the server**. The other player does not need to be online: this is not a real-time match. Modes: challenge a friend, random opponent, or enemy faction. Inter-village duels feed the Village weekly standings.

---

## The shop

### Scrolls

A scroll contains **5 cards** by default (7 for Elite, 10 for Ascendant).

| Scroll         | Price          | Cards  | Normal | Rare | Legendary | Mythic |
| -------------- | -------------- | ------ | ------ | ---- | --------- | ------ |
| **Standard**   | 300 Ryos       | 5      | 70%    | 23%  | 5.5%      | 1.5%   |
| **Path** (×4)  | 550 Ryos       | 5      | 65%    | 26%  | 7%        | 2%     |
| **Elemental**  | 650 Ryos       | 5      | 65%    | 26%  | 7%        | 2%     |
| **Premium**    | 100 Kage Coins | 5      | 55%    | 32%  | 10%       | 3%     |
| **Elite**      | 250 Kage Coins | 7 (+2) | 40%    | 35%  | 18%       | 7%     |
| **Ascendant**  | 500 Kage Coins | 10 (+5)| 25%    | 35%  | 28%       | 12%    |

- **Path** scrolls (Taijutsu, Ninjutsu, Genjutsu, Medicine) only roll cards from that path.
- The **Elemental** scroll only contains cards tied to an element. You can choose which one.
- The **Premium** scroll guarantees at least one rare-or-better card.
- The **Elite** and **Ascendant** scrolls guarantee at least one legendary-or-better card.
- A card you already own is added as an extra copy.

Season-exclusive cards do not come out of scrolls.

### Kage Coins

Kage Coins are bought with real money, through secure payment:

| Pack          | Kage Coins          | Price |
| ------------- | ------------------- | ----- |
| Chakra Spark  | 100                 | €1    |
| Village Ember | 500 + 50 bonus      | €5    |
| Shadow Forge  | 1,000 + 150 bonus   | €10   |
| Kage's Vault  | 5,000 + 1,000 bonus | €50   |

Kage Coins are used to open Premium, Elite and Ascendant scrolls and unlock the premium track of the season pass. All game content remains available without buying any.

---

## The season pass

The season pass has **50 levels** and **two reward tracks**:

- the **free track**, open to everyone;
- the **premium track**, unlocked for **500 Kage Coins**. It also gives **+20%** pass XP for the whole season.

### Earning pass XP

- by completing **missions**: the higher the rank, the larger the gain;
- by completing **quests**:

| Quest            | Pass XP |
| ---------------- | ------- |
| Daily            | 200     |
| Weekly           | 1,000   |
| Season milestone | 5,000   |

A completed quest must be **claimed** to credit its XP.

### Levels

Each level takes 1,000 pass XP for levels 1 to 10, then 50 more XP per block of ten levels: 1,050 for levels 11 to 20, up to 1,200 for levels 41 to 50.

### Rewards

Each level reached opens a reward on each track: Ryos, card dust, essence, Kage Coins, cards or scrolls. A reward must be **claimed** on the pass page. Premium track rewards require the premium unlock.

---

## Currencies and resources

| Resource       | How to get it                                                 | What it is for                                              |
| -------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| **Ryos**       | Missions, quick duels, season pass                            | Standard and Elemental scrolls, card upgrades, talent reset |
| **Kage Coins** | Shop purchase, season pass                                    | Premium scrolls, premium pass track                         |
| **Card dust**  | Disenchanting, season pass                                    | Card upgrades                                               |
| **Essence**    | Disenchanting upgraded legendary or mythic cards, season pass | Final upgrades of legendary and mythic cards                |
| **Mission purse** | Stake at launch (0–300 Ryos) + node/fight gains               | Peddler purchases; remainder returns as Ryos on victory     |

---

## Update history

| Date       | Change                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-23 | Normal-only starter; Common rarity renamed Normal; onboarding “create a deck” |
| 2026-11-23 | Deck composition: 15 + 5 (free splash), two starter decks Taijutsu / Ninjutsu |
| 2026-11-22 | Branched runs: purse 0/100/200/300, 4-slot inventory, run shop, XP forks, no more contraband |
| 2026-11-20 | Mission gates by character rank; D hard / C demanding; combat detail (heritages, chains, glossary) |
| 2026-11-14 | Full rewrite for the current version: single ninja, 20–30 card deck, talent tree, turn-based combat, mission runs, shop, season pass, arena |
