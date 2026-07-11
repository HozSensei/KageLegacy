# Kage Legacy — Game Rules

**Kage Legacy** is an asynchronous browser-based shinobi manager. You play a **Jonin-Sensei**: you manage a squad of young ninjas, your **Ryos** budget, and face other Sensei in **league pools** over **72-hour cycles** (real time).

*Last updated: July 2026*

---

## 1. The 72-hour cycle

Each cycle is a synchronized "game week" for all players on the server.

| Phase | Period | Main activities |
|-------|--------|-----------------|
| **Preparation** | H0 → H35 | Squad, tactics, training, missions, shop, Academy, **reconnaissance mission (H0–H36)** |
| **Mid-cycle** | H36 → H70 | Chunin exams (H36), scouting, ongoing management |
| **Operation** | H71 | League match simulated; narrative chronicle revealed progressively |
| **Closure** | H72 | Mission resolution, league payouts, salaries, stagnation, Bird Flight, training billing, new cycle |

### Tactical lock

| Milestone | Effect |
|-----------|--------|
| **H54** | **Lineup locked** (active trio) ; training locked ; **full scout report** on spotted enemy unit |
| **H54 → H70** | Orders, tactic cards and items still editable |
| **H71** | Full lock until next cycle |

### Automatic milestones

- **H0 → H36**: reconnaissance mission (one sparring fight per cycle, see § League).
- **H36**: Chunin exams resolved ; **opponent tendencies** (if reconnaissance completed).
- **H54**: lineup freeze + **frozen full scout report**.
- **H71**: league match simulation ; final orders lock ; narrative chronicle begins.
- **H72**: economic closure and start of the next cycle.

---

## 2. The Sensei (your account)

### Resources

- **Ryos**: village currency. Income (league, missions, Bird Flight…) and expenses (salaries, training, purchases…) accumulate here.
- **Reputation**: prestige, notably from Bird Flight.
- **Match chakra**: limited reserve to intercept fatal blows during the operation. Each interception consumes a substantial share of this reserve.

### Sensei identity

Your **Sensei name** and visual identity (Elite Pack) define your league presence. There is no specialty to pick at account creation: preparation comes from your squad, combat orders, and tactic cards.

### Debt and administrative freeze

If your Ryos balance becomes **negative** (unpaid salaries, overspending), an **administrative freeze** blocks new spending: shop, player market, Chunin exam, hospital, etc. Restore your treasury to resume purchases.

A small overdraft may be allowed; persistent debt incurs **interest** at cycle closure, increasing economic pressure without immediate game over.

### Guest account

A **guest account** lets you try the game for a limited time, then convert to a permanent account.

---

## 3. Ninjas

### Grades

Three grades structure a career: **Genin**, **Chunin**, **Jonin** (reached via Bird Flight departure, not by staying in the squad).

Each grade imposes **stat caps**: a Genin cannot train forever; they must pass the Chunin exam to unlock a higher cap.

### The six stats

| Category | Stats |
|----------|-------|
| **Combat** | Taijutsu, Ninjutsu, Genjutsu, Medicine |
| **Support** | Speed, Intelligence |

In match, **physical toughness** depends mainly on Taijutsu; **chakra reserve** combines grade and Ninjutsu. **Initiative** and some Sensei techniques rely on Speed and Intelligence.

### Weekly form

Each ninja has **form** for the cycle (best to worst: Divine → Excellent → Passable → Lamentable). It proportionally modifies **all** stats: good form boosts performance; poor form heavily penalizes it.

After a match, K.O.'d ninjas drop **one form tier**. At H72, HP and chakra are fully restored.

### Character traits

Each ninja has a **trait** affecting operation behavior:

| Trait | Behavior (summary) |
|-------|-------------------|
| **Selfish** | More aggressive when allies are weakened; sometimes ignores defensive targeting |
| **Altruistic** | May take a fatal blow for an ally |
| **Lazy** | Resists the first Genjutsu suffered; may skip training |
| **Reckless** | Very fast on turn one; spends more chakra |
| **Disciplined** | Standard, predictable behavior |

### Elements (affinity)

Five elements form an **advantage circle**: Katon beats Futon, Futon beats Doton, Doton beats Raiton, Raiton beats Suiton, Suiton beats Katon.

In duels, a favorable element **boosts** damage; an unfavorable one **reduces** it. The gap alone is never decisive, but it can tip a close exchange.

### Clans and lineages

Seven lineages exist: Commoner, Nara, Uchiha, Hyuga, Sarutobi, Akimichi, Yamanaka.

- **Commoners** are most frequent at the Academy.
- **Village clans** are rarer and orient stats.
- **Noble lineages** are rarest and most expensive; they strongly bias specialization.

Each clan influences **path** (main art) and some stat bonuses at generation.

### Path, potential, and age

- **Path**: combat specialization (Taijutsu, Ninjutsu, Genjutsu, Medicine). Most bonus points concentrate on this path.
- **Potential**: Ordinary, Promising, or Prodigy. Higher potential means a sharper profile and more efficient progress.
- **Age** (15–18): younger ninjas learn **faster** in training; older ones progress more slowly.

### Morale

Morale (internal scale) affects squad stability. It drops notably on Chunin exam failure, unpaid salaries, **stagnation** (see §5), or buying a ninja on the player market.

---

## 4. The squad

### Composition

- **3 active ninjas** (field positions) + a **bench** of reserves.
- Composition can be changed until H71.
- A ninja is **unavailable** if on a mission, listed on the P2P market, or when the tactical window is closed.

### Individual orders

Each active ninja receives **one combat order**. This is the main in-match lever: it changes targeting, healing, and attack priority.

| Order | Role in match | When to use |
|-------|---------------|-------------|
| **Normal** | Balanced behavior; enemies target you by standard rules. | Versatile ninja, or when you don't want to force a role. |
| **Offensive** | Attack priority: the ninja uses their best combat stat to strike. | Damage specialist, burst, fast pressure; squads that want to end early. |
| **Defensive** | High chance of **being targeted** when the enemy attacks — acts as a shield. | Absorb pressure to protect a fragile ally; parry or damage-reduction cards. |
| **Protection** | Can **heal a designated ally** when critically wounded. | Support, medic, holding the line; healing cards. |

> **Terminology:** in the UI and this guide, **Defensive** replaces the old “Tank” label (provocation) and **Protection** replaces “Protect” (ally support). Server values are unchanged.

### How to compose your squad

- **2 Offensive + 1 Defensive**: direct pressure with a shield.
- **1 Offensive + 1 Defensive + 1 Protection**: classic balance — burst, absorption, heal.
- **2 Protection + 1 Defensive**: slow match, survival and attrition (genjutsu, heals).
- **3 Normal**: no assumed role — viable but no targeting synergy.

**Traits** change this: **Selfish** ninjas may ignore defensive targeting and will never take the Defensive order.

### Operation dossier (postures)

From **H36**, **scouting** reveals hints about the opponent (arts, spotted orders, speed, element). On the **Squad** screen, the **operation dossier** lets you pick a **posture** before the tactical lock (**H71**).

| Posture | Intent | When to pick |
|---------|--------|--------------|
| **Balanced** | No strong bet this cycle. | Fuzzy opponent read, mixed squad, or still tuning orders and cards. |
| **Offensive** | Win initiative and finish fast. | Your squad runs Offensive orders; scout shows an offensive spread or a slow enemy. |
| **Defensive** | Hold the line under pressure. | You have at least one Defensive order; enemy shows **2+ Offensive** orders. |
| **Protection** | Survive tempo, heal, protect. | You run Protection orders and healing cards; enemy is **fast** or **high potential** (long trades risky). |

**Important:** posture grants **no hidden combat bonus**. It records your **cycle plan** and shapes **dossier advice** (cross-checked with scouting). For the plan to matter, align **posture + orders + tactic cards** on each ninja.

### Tactic cards

Each active ninja can equip **one tactic card** (inventory → equip). Cards replaced the old composition circle (Assault / Wall / Flow): they add situational effects in combat.

| Rule | Detail |
|------|--------|
| **Charges** | 3 charges per card; a charge is spent **only when the card triggers**. |
| **Proc** | **At most one trigger per ninja per match.** |
| **Depletion** | At 0 charges, the card leaves inventory (re-loot). |
| **Synergy** | **Attack** cards → Offensive; **defense** cards → Defensive; **support** cards → Protection. |

Examples: parry when targeted twice same turn (Defensive), chip damage on attack (Offensive), heal wounded ally (Protection).

---

## 5. Grade progression

### Start

You begin with **6 ninjas**: one active Chunin in the center, five Genin (two active, three on the bench). Each character trait appears once in the starting squad.

### Chunin exam

- **Registration**: before H36 (preparation phase).
- **Resolution**: automatic at H36.
- **Requirements**: sufficient combat stat and Intelligence.
- **Cost**: Ryos registration fee, **higher** if the candidate is already advanced (the server indexes price on the ninja's profile).
- **Success**: promotion to Chunin and raised caps.
- **Failure**: ninja stays Genin; morale drops.

### Bird Flight (Chunin → departure)

- **Registration**: during the cycle, before H72.
- **Resolution**: at H72.
- **Requirements**: high combat stats and Intelligence (thresholds above Chunin exam).
- **Registration cost**: free.
- **Payout**: substantial, based on the departing Chunin's overall level (+ reputation).
- **Relief**: a **commoner Genin** replacement arrives (good form and high morale).
- **Heritage**: the Chunin leaves a **wall heritage scroll** — permanent, stackable bonus by dominant stat (discount on shop, training, hospital, or match items, depending on departure profile).

### Stagnation

At H72, a ninja **eligible** for grade advancement (exam or Bird Flight) but **not registered** is penalized: form drops one tier and morale falls. The game pushes career evolution or accepting the cost of keeping a veteran.

---

## 6. Training

- Each ninja can receive a **focus** (targeted stat) for the current cycle.
- Only ninjas for whom you **explicitly** chose a focus are trained.
- Progress applies at **H72**; Ryos cost is billed then if your treasury allows.
- Ninja age moderates efficiency: younger progress faster.
- A stat at the **grade cap** no longer progresses until the ninja advances grade.
- The **Office** shows spending forecast (per ninja, cycle total, estimated balance after closure).

---

## 7. Missions (idle contracts)

Missions are for **bench** ninjas only (not the active squad).

### General rules

- **One mission per danger tier** per cycle (up to three different contracts).
- Automatic resolution at **H72**.
- Rewards must be **collected manually** after resolution.

### Tiers

| Tier | Reward | Risks | Requirements |
|------|--------|-------|--------------|
| **Routine** | Modest Ryos | None | All ninjas |
| **Infiltration** | Medium Ryos | Possible light injury | Sufficient Speed or Intelligence |
| **Cyclone** | High Ryos | Serious injury or death possible | At least one high combat stat |

### Injury consequences

- **Light**: impact on form.
- **Serious**: lowest form + several cycles of convalescence without hospital treatment.
- **Death**: ninja is permanently lost.

### Loot

Missions may yield **utility items** (bandages, kits, smoke bombs, scrolls…) or, more rarely, exceptional profiles.

---

## 8. Economy

### Main income

| Source | Nature |
|--------|--------|
| **League** | Payout by win, draw, or loss |
| **Missions** | Idle contracts by tier |
| **Bird Flight** | Departing Chunin payout |

### Main expenses

| Item | Timing |
|------|--------|
| **Salaries** | H72 — active squad only |
| **Training** | H72 — ninjas with active focus |
| **Chunin exam** | On registration |
| **Hospital** | On demand |
| **Academy** | On aspirant purchase |
| **Village shop** | During the cycle |
| **Player market** | On purchase (seller commission) |

Salaries rise with a ninja's **overall level**: an experienced squad is expensive to maintain.

### Items (three categories)

| Type | Use |
|------|-----|
| **Office** | Consumed immediately from the Office (heals, maps, scrolls…) |
| **Match** | One slot per ninja; effect triggers in operation if conditions are met |
| **Cycle** | Effect for the whole cycle (weather, salaries, form…) |

### Village shop

- **Personal** catalogue, periodic restock (every few league cycles).
- Random promotions each cycle.
- Closed when in debt or during H71+ lock.

### Player market (Exchanges)

- Sell bench ninjas or unequipped items.
- Limited number of active listings.
- Commission on sale (slightly higher for noble lineages).
- **Global** market: all human Sensei on the server; league remains the competitive frame.
- Closed from H71.

---

## 9. Academy and Chakra Seal

### Academy (recruitment)

- **Three Genin aspirants** always visible at the Office.
- Every **24 hours (UTC)**, the oldest aspirant expires; others shift; a new one appears.
- Recruitment possible while the operation is not locked (before H71).
- Each aspirant shows path, potential, lineage, and a **price** by profile rarity.
- One paid recruitment per rotation window (take it or leave it).

### Chakra Seal (daily ritual)

- **One free seal per day** (midnight UTC), with a limited max stock.
- Open at the Office: random loot (common → rare → epic → very rare jackpot).
- The **jackpot** (Golden Seal) guarantees the **next** Academy aspirant will be a Prodigy or noble lineage.

---

## 10. Hospital

- Heals ninjas in **Lamentable** form (except extended convalescence after serious mission injury).
- Ryos cost by ninja **grade**.
- Heritage scrolls can reduce cost.
- Closed during H71+ lock.

---

## 11. Player clans (cooperation)

Hub **without combat bonuses** — up to **12 Sensei** per clan.

### Academy display board

- Each member can **recommend an aspirant** from their showcase to the clan board (once per cycle).
- Visible to allies until the aspirant expires.
- Each ally recruits with **their own Ryos**.

### Collective Chakra well

- Each daily Chakra Seal broken adds a **drop** to the clan well.
- At a collective threshold, all members receive a **bonus Chakra Seal** (within personal stock limit).

---

## 12. League

### Structure

- **Pools** of 6 Sensei (humans and/or bots).
- **Season**: 10 cycles round-robin (everyone plays everyone).
- **5 divisions**: 1st is elite, 5th is lowest.

### New player integration

- Every new human starts in the **lowest division**.
- If joining a pool with a **bot**, they take its place in the current schedule.
- Otherwise, a new pool is created (1 human + filler bots).

### Points and standings

| Match result | Points |
|--------------|--------|
| Win | 3 |
| Draw | 1 |
| Loss | 0 |

Tie-breakers: wins, then matches played.

### End of season (cycle 10)

- **1st**: division promotion.
- **6th**: relegation.
- New pool and new schedule.

### Scouting (from H36)

Intel unfolds in **two stages**:

1. **H36 — Tendencies**: habits from recent league matches (sample size shown ; unreliable on 1st or 2nd match).
2. **H54 — Spotted unit**: frozen report on the enemy trio (partial or full depending on your reconnaissance).

Between H36 and H54, adjust your lineup from tendencies. After H54, only orders, cards and items remain editable.

### Reconnaissance mission (H0 → H36)

Sparring combat to **test your squad** during the preparation phase, before the operation tactical lock. **One mission per cycle** per Sensei.

| Mode | How it works |
|------|----------------|
| **Matchmaking** | Human opponent of similar division and power; otherwise a **league bot**. |
| **Direct challenge** | From the League screen: challenge a pool member or a nearby-division player from another league. Defender must **accept**. |

**Consequences**: real combat engine (gear, tactic cards, environment); K.O.s can **lower form** like league matches. **Loot**: Ryos + random consumable + tactic card chance (even on a loss). Does **not** affect league standings.

### Invitation

A Sensei can generate an **invitation link** to their pool to recruit allies in their league.

---

## 13. Border operation (league match)

### What you see

- **Narrative chronicle**: story unlocked progressively after H71 (both opponents read the same tale at the same pace).
- **Mechanical debrief**: possession, scores, environment, equipment — more analytical tone, personalized per player.
- **Spectator**: watch matches from other pools.

### Match structure

- **Twelve turns maximum**.
- Each turn: initiative → attacker choice → target → duel resolution.
- **Random environment** (weather, terrain) with modifiers; some cycle items offset unfavorable conditions.

### Duel resolution (no formulas)

Each exchange pits attacker vs defender. The server combines:

- relevant stats (combat, speed, intelligence);
- a **random factor** (dice) to avoid purely deterministic outcomes;
- modifiers: elements, form, team composition, traits, equipment;
- special events: **crits**, **misses**, **Genjutsu** (paralysis or confusion), **Protection** order heals.

The **Sensei** may try to **intercept a fatal blow** on a ninja: this spends match chakra and depends on squad average Intelligence.

### Victory conditions

1. **Immediate K.O.**: if all actives on a team are down (HP or chakra depleted), the opponent wins outright.

2. **End of twelve turns**: if neither team is fully eliminated, the server computes a **remaining strength score** per side, weighting HP and chakra left. A **clear gap** between scores is needed to declare a winner; otherwise, **draw**.

**Possession** (initiative time) serves narration and debrief — it does **not** determine the winner.

### Consequences (at H72)

| Result | League points | Base Ryos (H72) | Bonus loot |
|--------|---------------|-----------------|------------|
| Win | 3 | 1,600 | Extra Ryos + random consumable + tactic card chance |
| Draw | 1 each | 800 each | Same (lower odds) |
| Loss | 0 | 100 (consolation) | Same (lower odds) |

---

## 14. Game screens

| Screen | Role |
|--------|------|
| **Office** | Hub: budget, exams, Bird Flight, hospital, Academy, Chakra Seal |
| **Squad** | Composition, orders, operation dossier (postures), active/bench swaps |
| **Training** | Stat focus, cost forecast |
| **Missions** | Idle contracts |
| **League** | Standings, schedule, scouting, reconnaissance mission |
| **Shop** | Village item purchases |
| **Exchanges** | Player market |
| **Inventory** | Items and match/cycle equipment |
| **Clan** | Academy board, Chakra well |
| **Operation** | Match chronicle and debrief |

---

## 15. Notifications

A bell in the interface signals important events: mission completion, exam results, cycle closure, league messages, etc.

---

## Update history

| Date | Change |
|------|--------|
| 2026-07-09 | Initial document (player rules, no exact formulas) |
| 2026-07-10 | Orders renamed (Defensive / Protection), posture & tactic card guide; removed Assault/Wall/Flow circle |
