# Kage Legacy — Game Rules

**Kage Legacy** is an asynchronous browser-based shinobi manager. You play a **Jonin-Sensei**: you manage a squad of young ninjas, your **Ryos** budget, and face other Sensei in **league pools** over **72-hour cycles** (real time).

This guide is organized in **two parts**:

1. **The interface** — what each screen does, grouped like the navigation menu.
2. **Game systems** — detailed rules (cycle, progression, combat, economy…).

*Last updated: July 2026*

---

# Part 1 — The interface

The side menu groups screens into **five sections**: Command center, Squad & progression, Missions & league, Economy, and Account & tools. The progress bar at the top shows the current cycle hour (H0 → H72).

## Command center

### Office

**Route:** `/bureau` — main **hub** of the game.

Your daily dashboard. You will find:

| Area | Role |
|------|------|
| **First steps** | Early-career checklist (deck, training, mission, recon, league) — skippable, hides nothing |
| **Village** | Belong to one of 4 lands (Hi no Kuni, Kaze no Kuni, Mizu no Kuni, Tsuchi no Kuni) + cycle rivalry (solo-action score, no combat bonus) |
| **Treasury** | Ryos balance, reputation, salary + training forecast at H72 |
| **Active squad** | Overview of the 3 field ninjas and quick access to their profiles |
| **Chakra Seal** | Free daily ritual (midnight UTC) — see § Academy and Chakra Seal |
| **Chunin exam** | Register an eligible Genin before H72 |
| **Bird Flight** | Register a Chunin ready to depart before H72 |
| **Stagnation** | Warnings on eligible ninjas not registered for advancement |
| **Academy** | Showcase of 3 Genin aspirants on rotation — paid recruitment |
| **Dispensary** | Healing for ninjas in Lamentable form (hospital) |

The Office concentrates **cycle management** actions: budget, recruitment, care, and career registrations. Check it at cycle start and before milestones H54 / H71.

### Village

**Route:** `/village`

Four **lands** (Hi no Kuni, Kaze no Kuni, Mizu no Kuni, Tsuchi no Kuni) form a **global** faction rivalry, orthogonal to player clans and the league.

- Chosen at registration (+ 1 early retake if you have not scored yet)
- Points from solo actions (seal, missions, recon, league match, exams, Bird Flight) — per-cycle cap
- Each cycle: one **paired** rivalry; at H72 the leading **land** earns a small Ryos chest for contributors
- **No combat bonus**

The league (pools, H71 match, promotion/relegation) stays unchanged.

### Cycle journal

**Route:** `/journal`

Chronological activity feed for your cycle: training gains, mission results, economic closure, league messages, etc. Useful to trace what happened without reopening every screen.

### Profile

**Route:** `/profil`

Public Sensei identity: name, heritage wall (scrolls left by Chunin who departed via Bird Flight). Other players can view your profile via `/sensei/:id`.

---

## Squad & progression

### Squad

**Route:** `/squad`

Central screen for **tactical preparation**:

| Feature | Detail |
|---------|--------|
| **Lineup** | 3 active ninjas + bench reserves; active ↔ bench swaps until H54 |
| **Operation deck** | Per active: technique card + primary/secondary domains (6 cards per ninja) — see § Operation deck |
| **Briefing** | Reminder of league opponent and next match |
| **Player market** | List a bench ninja for sale or release them |

A ninja is **unavailable** if on a mission, listed on the player market, or when the tactical window is closed (H71+).

### Training

**Route:** `/training`

Configure training plans for the cycle:

| Lever | Scope | Cost |
|-------|-------|------|
| **Preparation** | One type per active ninja (3 choices) | Billed in Ryos at H72 |
| **Global training** | One type for the whole squad | Free |

Six types available (Chakra, Physical, Medical, Genjutsu, Ninjutsu, Balanced). The screen shows **cost forecast** and expected gains. Training is **locked at H54** (lineup frozen). Mechanical details: see § Training.

### Clan

**Route:** `/clan`

**Cooperative hub without combat bonuses** (up to 12 Sensei):

- **Create or join** a clan.
- **Academy display board**: recommend an aspirant from your showcase (once per cycle).
- **Chakra well**: each daily seal feeds a collective threshold → bonus seal for all members.

Details: see § Player clans.

---

## Missions & league

### Missions

**Route:** `/missions`

Send **idle missions** (ranks D, C, B, A) to **bench ninjas only**:

- Up to **3 ninjas** on mission at once (global cap, no per-rank limit).
- Duration by rank: **D 4h · C 8h · B 24h · A 48h** (return must land before cycle end).
- Success odds shown based on the ninja's overall rating.
- Automatic resolution at the due hour; rewards must be **collected manually**.

A **reconnaissance** panel is also accessible from this screen. Details: see § Idle missions.

### Reconnaissance

**Route:** `/reconnaissance`

Sparring combat to **test your lineup** between **H0 and H36**:

| Mode | How it works |
|------|----------------|
| **Matchmaking** | Nearby-division human opponent, otherwise a league bot |
| **Direct challenge** | Challenge a pool member or a nearby-division player (acceptance required) |

One mission per cycle. The outcome gates **scouting quality** (H36 / H54). Details: see § Reconnaissance.

### Scouting

**Route:** `/espionnage`

Intel report on your **league opponent** for the cycle:

| Milestone | Content |
|-----------|---------|
| **H36** | Tendencies from recent matches (requires reconnaissance this cycle) |
| **H54** | Full frozen report on the enemy trio (partial or full depending on reconnaissance) |

Compare tendencies (H36) and spotted unit (H54) to detect atypical formations. Details: see § The 72-hour cycle.

### League

**Route:** `/league`

Competitive view of your **pool** (6 Sensei):

- Standings with **H2H** and **Nemesis** badge, schedule for the 10-cycle season.
- **Season wall** (free discussion, pagination; resets at season end).
- Points (win 3, draw 1, loss 0) and promotion / relegation at season end.
- **Invitation link** (human / bot counts) to replace a bot.
- Recon challenges: **same pool** or **another league** (nearby division) — acceptance required.

Structure details: see § League.

### Operation

**Route:** `/operation`

League match for the cycle (**H71 → H72**):

- **Narrative chronicle** revealed progressively (same pace for both opponents).
- **Mechanical debrief**: plis won, HP scores, environment.
- **Spectator** mode for other pools' matches.

Combat details: see § Border operation.

---

## Economy

### Shop

**Route:** `/market`

**Village shop** — purchases with your Ryos:

- Utility items (office, cycle) by category.
- **Technique card offers**: 10 random draws per restock, fresh bonus % on purchase.
- Random promotions each cycle; personal catalogue restocked periodically.

Closed when in **debt** or during **H71+** lock. Details: see § Economy.

### Refinement

**Route:** `/refinement`

**Refinement hall** — paid re-roll of a owned technique card's **% bonus**:

- Cost by card rarity; possible discount via shop heritage.
- Blocked if treasury is negative or card is listed on the player market.
- Also accessible from **Inventory**.

Card details: see § Ninja technique cards.

### Exchanges

**Route:** `/exchanges`

**Player market** (P2P):

- Sell bench ninjas or unequipped items / cards.
- Limited number of active listings; commission on sale.
- **Global** market (all human Sensei on the server).

Closed from **H71** and when in debt.

### Inventory

**Route:** `/inventory`

Manage your **stock**:

| Category | Use |
|----------|-----|
| **Technique cards** | Assignment per active ninja for the operation deck |
| **Office consumables** | Immediate use on a ninja |
| **Cycle equipment** | 1 per ninja for the whole cycle |

Actions: equip, use, list on player market, open refinement.

---

## Account & tools

### Notifications

**Bell** icon in the header: mission completion, exam results, cycle closure, operation start, scout report, clan well, etc. Each notification links to the relevant screen.

### Game rules

**Route:** `/rules` — this document, also accessible from the profile menu (theme, language, logout).

---

# Part 2 — Game systems

## The 72-hour cycle

Each cycle is a synchronized "game week" for all players on the server.

| Phase | Period | Main activities |
|-------|--------|-----------------|
| **Preparation** | H0 → H35 | Squad, deck, training, missions, shop, Academy, reconnaissance (H0–H36) |
| **Mid-cycle** | H36 → H70 | Opponent tendencies, scouting, ongoing management |
| **Operation** | H71 | League match simulated; narrative chronicle revealed progressively |
| **Closure** | H72 | Safety net for still-active missions, league payouts, salaries, stagnation, Bird Flight, training billing, new cycle |

### Tactical lock

| Milestone | Effect |
|-----------|--------|
| **H54** | **Lineup locked** (active trio); training locked; H36 tendencies already available; **full scout report** on spotted enemy unit |
| **H54 → H70** | Deck still editable |
| **H71** | Full lock until next cycle |

### Scouting (milestones)

| Milestone | Content |
|-----------|---------|
| **H36** | **Tendencies** from the opponent's recent league matches — requires a successful **reconnaissance** this cycle |
| **H54** | **Full report** frozen on enemy lineup (partial/full quality depending on your reconnaissance) |
| **H54 → H71** | Report no longer changes; compare tendencies vs spotted unit to detect atypical formations |

The **reconnaissance** mission (H0–H36) gates access and quality of intel — it is not a fight against your league opponent, but a field mission to gather intelligence.

Chunin exams, healing, and missions should be **settled before H54** to avoid a hole in the frozen lineup.

### Automatic milestones

- **H0 → H36**: reconnaissance window.
- **H36**: opponent tendencies (if reconnaissance completed); resolution of ongoing reconnaissance missions.
- **H54**: lineup freeze + frozen full scout report.
- **H71**: league match simulation; final lock; narrative chronicle begins.
- **H72**: Chunin exam verdicts, Bird Flight, economic closure, new cycle.

---

## The Sensei (your account)

### Resources

- **Ryos**: village currency. Income (league, missions, Bird Flight…) and expenses (salaries, training, purchases…) accumulate here.
- **Reputation**: prestige, notably from Bird Flight.
- **Match chakra**: limited reserve to intercept fatal blows during the operation. Each interception consumes a substantial share of this reserve.

### Sensei identity

Your **Sensei name** defines your league presence. There is no specialty to pick at account creation: preparation comes from your squad and operation deck.

### Debt and administrative freeze

If your Ryos balance becomes **negative** (unpaid salaries, overspending), an **administrative freeze** blocks new spending: shop, player market, Chunin exam, hospital, refinement, etc. Restore your treasury to resume purchases.

A small overdraft may be allowed; persistent debt incurs **interest** at cycle closure, increasing economic pressure without immediate game over.

### Guest account

A **guest account** lets you try the game for a limited time, then convert to a permanent account.

---

## Ninjas

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

### Character profiles

Each ninja may have a **profile** that slightly biases **one** stat at generation (+1 or +2 already baked into the sheet). About one third of ninjas have **no profile**.

| Profile | Favored stat |
|---------|--------------|
| **Brute** | Taijutsu |
| **Channeler** | Ninjutsu |
| **Illusionist** | Genjutsu |
| **Healer** | Medicine |
| **Swift** | Speed |
| **Strategist** | Intelligence |
| **No profile** | No bias |

Boost intensity (+1 or +2) is shown by the **label color** on the sheet (stronger = +2) — the number is not written. Profile is orthogonal to **art**, **clan**, and **potential**.

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

Morale (internal scale) affects squad stability. It drops notably on Chunin exam failure, unpaid salaries, **stagnation** (see § Grade progression), or buying a ninja on the player market.

---

## Squad and operation deck

### Composition

- **3 active ninjas** (field positions) + a **bench** of reserves.
- Composition can be changed until **H54** (active trio locked).

### Operation deck (pli combat)

Each match plays out in **18 pli**: a shuffled deck of **6 cards per active ninja** — **1 inventory technique card** + **2× primary stat** + **3× secondary stat** (taijutsu, ninjutsu, genjutsu, medicine domains) + **relays** if slots are empty.

- **Max HP** = ninja overall grade × 5 (average of 6 stats).
- Each pli: both sides reveal a card; domain vs domain comparison (+20% if type advantage).
- **Victory**: more team HP at match end; tie → most plis won.
- **Match items** removed from combat; **technique cards** assigned per ninja; office consumables and cycle gear stay out of combat.
- **Carry-over**: each new league matchday, your deck is **copied** from the previous one (techniques for active ninjas; charges preserved).

### How to compose your squad

- Mix **arts** (Taijutsu, Ninjutsu, Genjutsu, Medicine) to cover domain advantages across plis.
- Prioritize a **coherent deck**: technique card aligned with the ninja's art, solid primary/secondary domains.
- Watch **scouting** (H36 trends, H54 lineup) to tune the deck before H71.

---

## Ninja technique cards

Each active ninja contributes **6 cards** to the operation deck: **1 inventory technique card** + **2 copies** of the primary stat + **3 copies** of the secondary stat.

| Rule | Detail |
|------|--------|
| **Bearer** | The card is played by the **assigned ninja**. |
| **Power** | Primary stat (+ secondary average: domain, speed or intelligence) × **unique % bonus** rolled on acquisition. |
| **Variable bonus** | Common 1–20% · with synergy 5–25% · rare 15–35% · legendary 30–50%. |
| **Prerequisites** | Some cards require the bearer's element (e.g. Water Blade → Suiton). |
| **Charges** | 5 charges; one spent when the card is **drawn** in a pli (near-guaranteed use each cycle). |
| **Player market** | The **instance** transfers as-is: **same % bonus**, same charges — no re-roll on purchase. |
| **Refinement hall** | Paid re-roll of the % bonus on an owned card (cost by rarity; shop heritage discount applies). |
| **Shop** | **10 random offers** from the catalog each restock (repeats allowed); **fresh bonus roll** on purchase. |
| **Effects** | Some cards have a **pli effect** (bonus damage, reduction, heal, opponent debuff next pli) — described on the card. |
| **Elements** | 16 cards require the bearer's element — **4 Suiton, 4 Futon, 4 Raiton, 4 Doton, 3 Katon** (balanced spread). |

Examples: **Chakra Blade** (+15%, no prerequisite), **Water Blade** (+30%, Suiton bearer), **Chakra Scalpel** (offensive medicine).

---

## Grade progression

### Start

You begin with **6 ninjas**: one active Chunin in the center, five Genin (two active, three on the bench). Each character trait appears once in the starting squad.

### Chunin exam

- **Registration**: before H72 (any time during the cycle).
- **Resolution**: automatic at H72.
- **Requirements**: **overall rating** ≥ 8 (sum of 6 stats ÷ 6, rounded).
- **Registration**: **free**.
- **Success**: 300–1,000 Ryos payout, +1 to +5 reputation, item, form +1 tier, morale +2 to +5.
- **Success**: promotion to Chunin and raised caps.
- **Failure**: ninja stays Genin; morale drops.

### Bird Flight (Chunin → departure)

- **Registration**: during the cycle, before H72.
- **Resolution**: at H72.
- **Requirements**: **overall rating** ≥ 14 (same formula as the Chunin exam).
- **Registration cost**: free.
- **Payout**: substantial, based on the departing Chunin's overall level (+ reputation).
- **Relief**: a **commoner Genin** replacement arrives (good form and high morale).
- **Heritage**: the Chunin leaves a **wall heritage scroll** — permanent, stackable bonus by dominant stat (discount on shop, training, hospital, or match items, depending on departure profile).

### Stagnation

At H72, a ninja **eligible** for grade advancement (exam or Bird Flight) but **not registered** is penalized after **one grace cycle**: first a warning with no malus, then form drops one tier and morale falls.

---

## Training

Two complementary levers:

| | **Preparation** (actives) | **Global training** (whole squad) |
|---|---------------------------|-----------------------------------|
| **Cost** | Billed in Ryos at H72 | **Free** |
| **Average gain** | 0.4 stat capital / ninja / cycle | 0.2 stat capital / ninja / cycle |
| **Choice** | One type per starter (3 actives) | One type for the whole team |

### Group types (6)

Chakra (IQ, ninjutsu, genjutsu) · Physical (taijutsu, speed) · Medical · Genjutsu · Ninjutsu · Balanced (all stats).

### Stat capital and variance

Each ninja draws a **share** of the pot (light cycle-to-cycle variance). **Prodigies** progress faster (×1.25); **promising** ×1.1.

### Stacking

A starter can stack **preparation + global** (e.g. both Chakra) to reach Chunin faster (~5 cycles ordinary, ~2–3 prodigy).

- Progress applies at **H72**; preparation billed if treasury allows.
- Age moderates efficiency; stats at **grade cap** stop until promotion.
- The **Office** shows forecast (salaries + preparation; global is free).

---

## Idle missions

Missions are for **bench** ninjas only (not the active squad).

### General rules

- **Global cap of 3 ninjas** on mission at once (multiple missions of the same rank allowed).
- Duration by rank (independent of the cycle); send is refused if there aren't enough hours left before H72.
- Automatic resolution at the **return hour** with a **success roll** (H72 safety net).
- After resolution, the ninja can **go out again**.
- Rewards must be **collected manually** after resolution.
- All ranks are **sendable**; the UI shows odds based on the ninja's **overall rating** (average of 6 stats, rounded).

### Ranks

| Rank | Duration | Ryos (success) | Target rating (50% success) | Risks on failure |
|------|----------|----------------|----------------------------|------------------|
| **D** | 4h | 300–500 | 4 | None |
| **C** | 8h | 600–800 | 6 | Possible light injury |
| **B** | 24h | 1,000 | 8 | Serious injury or death possible |
| **A** | 48h | 1,500–2,000 | 10 | High serious injury or death |

**Success**, **injury**, and **death** percentages scale with the gap between ninja rating and rank target. On **success**: Ryos, bonus loot, and **stat gain** (training complement). On **failure**: 0 Ryos, no loot.

### Progression via missions

Each success grants a small stat bump (e.g. +0.25 to +1.0 by rank). **Bench replacements** get a **bonus** (×1.5 on D/C) to offset slower global-only training.

### Injury consequences

- **Light**: Lamentable form.
- **Serious**: Lamentable form + several cycles without hospital treatment.
- **Death**: ninja is permanently lost.

### Loot

On **success** only: utility items (bandages, kits, smoke bombs, scrolls…) or, more rarely, prodigy recruitment on ranks B/A.

Detailed spec: [`specs/mission-rank-system.md`](../../../specs/mission-rank-system.md).

---

## Reconnaissance

Sparring combat to **test your squad** during the preparation phase, before the operation tactical lock. **One mission per cycle** per Sensei.

| Mode | How it works |
|------|----------------|
| **Matchmaking** | Human opponent of similar division and power; otherwise a **league bot**. |
| **Direct challenge** | From the League screen: challenge a pool member or a nearby-division player from another league. Defender must **accept**. |

**Consequences**: real combat engine (deck, environment); K.O.s can **lower form** like league matches. **Loot**: Ryos + random consumable + technique card chance (even on a loss). Does **not** affect league standings.

**Resolution**: at **H36**. The outcome determines scouting quality (H36 tendencies, H54 report).

---

## Economy

### Main income

| Source | Nature |
|--------|--------|
| **League** | Payout by win, draw, or loss |
| **Missions** | Idle missions by rank (D–A) |
| **Bird Flight** | Departing Chunin payout |
| **Reconnaissance** | Combat loot (Ryos, items, cards) |

### Main expenses

| Item | Timing |
|------|--------|
| **Salaries** | H72 — active squad only |
| **Training** | H72 — active preparation (paid); global training free for whole squad |
| **Chunin exam** | On registration |
| **Hospital** | On demand |
| **Academy** | On aspirant purchase |
| **Village shop** | During the cycle |
| **Refinement** | On demand (card bonus re-roll) |
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

## Academy and Chakra Seal

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

## Hospital

- Heals ninjas in **Lamentable** form (except extended convalescence after serious mission injury).
- Ryos cost by ninja **grade**.
- Heritage scrolls can reduce cost.
- Closed during H71+ lock.

---

## Player clans (cooperation)

Hub **without combat bonuses** — up to **12 Sensei** per clan.

### Academy display board

- Each member can **recommend an aspirant** from their showcase to the clan board (once per cycle).
- Visible to allies until the aspirant expires.
- Each ally recruits with **their own Ryos**.

### Collective Chakra well

- Each daily Chakra Seal broken adds a **drop** to the clan well.
- At a collective threshold, all members receive a **bonus Chakra Seal** (within personal stock limit).

---

## League

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
- The previous season's **league wall** is no longer shown.

### League wall

Season-long discussion thread for Sensei in your pool. No post quota (short messages, pagination). Automatic reset on a **new season** (promotion / relegation). A minimal FR/EN **word filter** masks swear words (keeps the first letter, replaces the rest with `*`).

### Head-to-head and nemesis

Standings show season **H2H** (wins–draws–losses) against each opponent. After **two consecutive losses** to the same Sensei, a **Nemesis** badge appears. A button can send a **reconnaissance challenge** (H0–H35) — the defender must accept.

### Invitation

A Sensei can generate an **invitation link** to their pool. The screen shows how many **humans** and **bots** remain: the goal is to replace a bot with an ally.

---

## Border operation (league match)

### What you see

- **Operation report**: short narrative intro, then **face-to-face pli exchanges** (winner highlighted, damage in **HP**), then a closing line. Same layout for **reconnaissance**.
- **Mechanical debrief**: plis won, remaining HP, environment — analytical tone, personalized per player.
- **Spectator**: watch matches from other pools.

### Match structure

- **Eighteen pli maximum** (6 cards × 3 active ninjas, shuffled).
- Each pli: simultaneous card reveal, power comparison, damage to the losing card's owner.
- **Random environment** (weather, terrain) with modifiers on relevant domains; terrain-counter items removed.

### Causal debrief

After the operation, each participating Sensei gets up to **3 readable causes** (domain edge, decisive technique card, Wretched form, incomplete deck…). Goal: understand *why*, not only the result.

### Matchup preview (scouting)

Once the enemy deck is visible via scouting, a **matchup preview** highlights domains where you are strong or weak before H71.

### Resolving plis

Each pli pits two cards (domain vs domain):

- type bonus +20% (Taijutsu > Genjutsu > Ninjutsu > Taijutsu);
- Intelligence/Speed as support depending on domain;
- Tai effects (+10% team next pli) and Gen (−10% enemy);
- Medicine: heal on win, 50% damage on loss;
- **Relay** cards if the owner is K.O. (random proxy, dominant stat) **or** if the deck is incomplete (technique not assigned, domains not saved).

### Victory conditions

1. **Immediate K.O.**: if all actives on a team are down (HP or chakra depleted), the opponent wins outright.

2. **End of plis**: if neither team is fully eliminated after all 18 pli, the winner is whoever has the most **team HP remaining**; on a tie, whoever won the most **plis**.

The **plis won** ratio feeds narration and debrief — it does **not** alone determine the winner (remaining HP takes priority).

### Consequences (at H72)

| Result | League points | Base Ryos (H72) | Bonus loot |
|--------|---------------|-----------------|------------|
| Win | 3 | 1,600 | Extra Ryos + random consumable + tactic card chance |
| Draw | 1 each | 800 each | Same (lower odds) |
| Loss | 0 | 100 (consolation) | Same (lower odds) |

---

## Update history

| Date | Change |
|------|--------|
| 2026-07-18 | Idle missions: duration by rank (D 4h / C 8h / B 24h / A 48h), cap of 3 ninjas in parallel, resolve at due hour |
| 2026-07-18 | Villages: player labels as lands (Hi / Kaze / Mizu / Tsuchi no Kuni); league bots spread across those lands |
| 2026-07-17 | Pli combat rebalance: max HP × 5 (was × 10) and higher pli damage so KOs are reachable |
| 2026-07-09 | Initial document (player rules, no exact formulas) |
| 2026-07-10 | Orders renamed (Defensive / Protection), posture & tactic card guide; removed Assault/Wall/Flow circle |
| 2026-07-15 | Restructured into two parts: interface by menus, then game systems |
| 2026-07-17 | Removed Elite Pack (disabled), obsolete orders/postures and match items; aligned on operation deck |
| 2026-07-17 | Character profiles (Brute…Strategist / no profile) — +1/+2 stat bias at generation |
| 2026-07-17 | Operation / recon report as face-to-face plis (damage in HP) |
| 2026-07-17 | League social S1: season wall, H2H / nemesis, cross-league challenges, invite polish |
