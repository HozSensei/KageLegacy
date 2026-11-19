/**
 * Mission runs — parcours multi-combats type roguelike léger.
 *
 * Flux :
 *   startRun → carte de nœuds (combats + événements)
 *   enterNode → combat (startCombat lié) ou détail événement
 *   resolveEvent → applique effet, débloque le nœud suivant
 *   onRunCombatFinished (hook moteur) → PV persistants ; mort = échec run
 *   Fin de parcours → grantRunRewards (meilleures que single fight)
 */
import { randomUUID } from 'node:crypto';
import { query } from '../config/database.js';
import { BASE_MAX_HP } from './deckCombat/constants.js';
import { createEmptyStats, getComputedStats } from './playerCharacterService.js';
import { grantRunRewards } from './combatRewardService.js';
import { getMission } from './combatMissionService.js';

const EVENT_TYPES = [
  'rest',
  'cache',
  'merchant',
  'crossroads',
  'whisper_grove',
  'crow_perch',
  'sealed_scroll',
  'mist_bridge',
  'spirit_lantern',
  'ash_camp',
];

const EVENT_META = {
  rest: {
    id: 'rest',
    nameFr: 'Sanctuaire de Mousse',
    nameEn: 'Moss Sanctuary',
    descriptionFr: 'Un autel moussu. Reposez-vous pour récupérer des forces.',
    descriptionEn: 'A mossy shrine. Rest to recover strength.',
  },
  cache: {
    id: 'cache',
    nameFr: 'Cache d’Éclaireur',
    nameEn: 'Scout Cache',
    descriptionFr: 'Une cache oubliée. Fouillez pour un butin modeste.',
    descriptionEn: 'A forgotten stash. Search for a modest haul.',
  },
  merchant: {
    id: 'merchant',
    nameFr: 'Colporteur d’Ombre',
    nameEn: 'Shadow Peddler',
    descriptionFr: 'Un marchand ambulant troque bandages contre du ferraille de run.',
    descriptionEn: 'A wandering peddler trades bandages for run scrap.',
  },
  crossroads: {
    id: 'crossroads',
    nameFr: 'Carrefour du Voile',
    nameEn: 'Veil Crossroads',
    descriptionFr: 'Deux sentiers. Choisissez : soins ou ferraille.',
    descriptionEn: 'Two paths. Choose: healing or scrap.',
  },
  whisper_grove: {
    id: 'whisper_grove',
    nameFr: 'Bosquet des Murmures',
    nameEn: 'Whisper Grove',
    descriptionFr:
      'Des feuilles chuchotent des noms oubliés. Écoutez pour soigner, ou cueillez pour la route.',
    descriptionEn: 'Leaves whisper forgotten names. Listen to heal, or gather for the road.',
  },
  crow_perch: {
    id: 'crow_perch',
    nameFr: 'Perchoir du Corbeau',
    nameEn: 'Crow Perch',
    descriptionFr:
      'Un corbeau marqué d’encre observe. Offrez de la ferraille pour sa faveur, ou partez enrichi.',
    descriptionEn: 'An ink-marked crow watches. Offer scrap for its favor, or leave richer.',
  },
  sealed_scroll: {
    id: 'sealed_scroll',
    nameFr: 'Parchemin Scellé',
    nameEn: 'Sealed Scroll',
    descriptionFr:
      'Un sceau de cire noire pulse encore. Lisez-le pour calmer le chakra, ou brisez-le pour le butin.',
    descriptionEn: 'Black wax still pulses. Read it to calm your chakra, or break it for loot.',
  },
  mist_bridge: {
    id: 'mist_bridge',
    nameFr: 'Pont de Brume',
    nameEn: 'Mist Bridge',
    descriptionFr:
      'Des planches disparaissant dans le brouillard. Traversez avec soin, ou courez vers l’autre rive.',
    descriptionEn: 'Planks vanishing into fog. Cross carefully, or sprint to the far bank.',
  },
  spirit_lantern: {
    id: 'spirit_lantern',
    nameFr: 'Lanterne d’Esprit',
    nameEn: 'Spirit Lantern',
    descriptionFr:
      'Une lanterne sans flamme attend. Allumez-la pour un répit, ou laissez l’ombre garder son secret.',
    descriptionEn:
      'A flameless lantern waits. Light it for respite, or leave the shadow its secret.',
  },
  ash_camp: {
    id: 'ash_camp',
    nameFr: 'Campement de Cendre',
    nameEn: 'Ash Camp',
    descriptionFr:
      'Des braises froides et des sacs abandonnés. Reposez-vous près du foyer, ou fouillez les cendres.',
    descriptionEn: 'Cold embers and abandoned packs. Rest by the hearth, or sift the ashes.',
  },
};

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function tableExists(tableName) {
  try {
    const rows = await query(
      `SELECT 1 AS ok FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
      [tableName]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

function pickEventType(index, rng = Math.random) {
  // Rotation déterministe + léger bruit pour variété MVP
  const base = EVENT_TYPES[index % EVENT_TYPES.length];
  if (rng() < 0.25) {
    return EVENT_TYPES[Math.floor(rng() * EVENT_TYPES.length)];
  }
  return base;
}

/**
 * Construit le parcours : combat → event → combat → … (+ boss flag déjà sur encounters).
 */
export function buildRunNodes(encounters, { rng = Math.random } = {}) {
  const fights =
    Array.isArray(encounters) && encounters.length
      ? encounters
      : [{ templateId: 'ronin_bandit', difficulty: 1 }];

  const nodes = [];
  let eventSlot = 0;

  for (let i = 0; i < fights.length; i += 1) {
    const fight = fights[i];
    nodes.push({
      id: `combat-${i}`,
      type: 'combat',
      status: i === 0 ? 'available' : 'locked',
      templateId: fight.templateId,
      difficulty: fight.difficulty || 1,
      boss: Boolean(fight.boss) || (i === fights.length - 1 && fights.length >= 4),
      nameFr: fight.nameFr || null,
      nameEn: fight.nameEn || null,
    });

    if (i < fights.length - 1) {
      const eventType = pickEventType(eventSlot, rng);
      eventSlot += 1;
      const meta = EVENT_META[eventType];
      nodes.push({
        id: `event-${i}`,
        type: 'event',
        status: 'locked',
        eventType,
        nameFr: meta.nameFr,
        nameEn: meta.nameEn,
        descriptionFr: meta.descriptionFr,
        descriptionEn: meta.descriptionEn,
        resolved: null,
      });
    }
  }

  return nodes;
}

function findAvailableIndex(nodes) {
  const idx = nodes.findIndex(n => n.status === 'available');
  return idx >= 0 ? idx : nodes.findIndex(n => n.status === 'locked');
}

function unlockNext(nodes, clearedIndex) {
  const next = [...nodes];
  next[clearedIndex] = {
    ...next[clearedIndex],
    status: 'cleared',
  };
  if (clearedIndex + 1 < next.length) {
    next[clearedIndex + 1] = {
      ...next[clearedIndex + 1],
      status: 'available',
    };
  }
  return next;
}

function clampHp(hp, maxHp) {
  return Math.max(1, Math.min(maxHp, Math.floor(hp)));
}

function healPercent(player, pct) {
  const maxHp = player.maxHp;
  const heal = Math.max(1, Math.floor(maxHp * pct));
  return {
    ...player,
    hp: Math.min(maxHp, player.hp + heal),
    lastHeal: heal,
  };
}

async function loadTalentEffectCodes(userId) {
  try {
    const { computeTalentBonuses } = await import('./talentTreeService.js');
    const bonuses = await computeTalentBonuses(userId);
    return (bonuses.effects || []).map(e => e.effectCode).filter(Boolean);
  } catch {
    return [];
  }
}

function getCurrentEvent(row, nodes, player) {
  if (row.state !== 'in_progress') return null;

  const node = nodes[Number(row.current_node_index)];
  if (node?.type !== 'event' || node.status !== 'available' || !node.eventOpen) {
    return null;
  }

  return buildEventPayload(node, player);
}

function serializeRun(row, extras = {}) {
  if (!row) return null;
  const nodes = parseJson(row.nodes_json, []);
  const player = parseJson(row.player_run_state_json, {});
  return {
    id: row.id,
    userId: row.user_id,
    missionId: row.mission_id,
    deckId: row.deck_id,
    state: row.state,
    currentNodeIndex: row.current_node_index,
    nodes,
    player,
    currentEvent: getCurrentEvent(row, nodes, player),
    stats: parseJson(row.stats_snapshot_json, createEmptyStats()),
    talentEffects: parseJson(row.talent_effects_json, { codes: [], applied: [], stubbed: [] }),
    currentCombatId: row.current_combat_id || null,
    rewards: parseJson(row.rewards_json, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...extras,
  };
}

async function loadRunRow(runId, userId) {
  const rows = await query('SELECT * FROM mission_runs WHERE id = ? AND user_id = ? LIMIT 1', [
    runId,
    userId,
  ]);
  if (!rows[0]) throw httpError(404, 'Parcours introuvable.');
  return rows[0];
}

async function persistRun(row) {
  await query(
    `UPDATE mission_runs
     SET state = ?, current_node_index = ?, nodes_json = ?, player_run_state_json = ?,
         current_combat_id = ?, rewards_json = ?
     WHERE id = ? AND user_id = ?`,
    [
      row.state,
      row.current_node_index,
      JSON.stringify(row.nodes_json),
      JSON.stringify(row.player_run_state_json),
      row.current_combat_id,
      row.rewards_json != null ? JSON.stringify(row.rewards_json) : null,
      row.id,
      row.user_id,
    ]
  );
}

/**
 * Démarre un nouveau parcours pour une mission.
 */
export async function startRun(userId, missionId, deckId = null) {
  if (!userId) throw httpError(400, 'userId requis.');
  if (!(await tableExists('mission_runs'))) {
    throw httpError(503, 'Tables mission_runs absentes — lancez les migrations (106).');
  }

  const active = await query(
    "SELECT id FROM mission_runs WHERE user_id = ? AND state = 'in_progress' LIMIT 1",
    [userId]
  );
  if (active[0]) {
    throw httpError(409, `Parcours déjà en cours (${active[0].id}). Terminez-le ou abandonnez-le.`);
  }

  // Bloquer aussi un combat orphelin (duel rapide)
  const activeCombat = await query(
    "SELECT id FROM combat_sessions WHERE user_id = ? AND state = 'in_progress' LIMIT 1",
    [userId]
  );
  if (activeCombat[0]) {
    throw httpError(409, `Combat déjà en cours (${activeCombat[0].id}).`);
  }

  const mission = await getMission(missionId);
  const { getPlayableDeckForCombat } = await import('./deckService.js');
  const deck = await getPlayableDeckForCombat(userId, deckId);
  const [{ total: stats }, effectCodes] = await Promise.all([
    getComputedStats(userId, { deckPassives: deck.passiveBonuses }),
    loadTalentEffectCodes(userId),
  ]);

  const { classifyTalentEffects } = await import('./deckCombat/talentEffects.js');
  const classified = classifyTalentEffects(effectCodes);
  const maxHp = BASE_MAX_HP + (Number(stats.maxHp) || 0);

  const resolvedDeckId = deck.id;

  const nodes = buildRunNodes(mission.encounters);
  const id = randomUUID();
  const player = {
    hp: maxHp,
    maxHp,
    scrap: 0,
    combatsWon: 0,
  };
  const talentEffects = {
    codes: effectCodes,
    applied: classified.applied,
    stubbed: classified.stubbed,
  };

  await query(
    `INSERT INTO mission_runs
      (id, user_id, mission_id, deck_id, state, current_node_index, nodes_json,
       player_run_state_json, stats_snapshot_json, talent_effects_json, current_combat_id, rewards_json)
     VALUES (?, ?, ?, ?, 'in_progress', 0, ?, ?, ?, ?, NULL, NULL)`,
    [
      id,
      userId,
      mission.id,
      resolvedDeckId,
      JSON.stringify(nodes),
      JSON.stringify(player),
      JSON.stringify(stats),
      JSON.stringify(talentEffects),
    ]
  );

  const row = await loadRunRow(id, userId);
  return serializeRun(row, {
    mission: {
      id: mission.id,
      slug: mission.slug,
      nameFr: mission.nameFr,
      nameEn: mission.nameEn,
      rank: mission.rank,
      rewards: mission.rewards,
    },
  });
}

export async function getRun(userId, runId) {
  const row = await loadRunRow(runId, userId);
  let mission = null;
  try {
    mission = await getMission(row.mission_id);
  } catch {
    /* ignore */
  }
  return serializeRun(row, {
    mission: mission
      ? {
          id: mission.id,
          slug: mission.slug,
          nameFr: mission.nameFr,
          nameEn: mission.nameEn,
          rank: mission.rank,
          rewards: mission.rewards,
        }
      : null,
  });
}

export async function getActiveRun(userId) {
  if (!(await tableExists('mission_runs'))) return null;
  const rows = await query(
    "SELECT * FROM mission_runs WHERE user_id = ? AND state = 'in_progress' ORDER BY created_at DESC LIMIT 1",
    [userId]
  );
  if (!rows[0]) return null;
  return getRun(userId, rows[0].id);
}

/**
 * Entre dans le nœud disponible : lance un combat ou expose l'événement.
 */
export async function enterNode(userId, runId) {
  const row = await loadRunRow(runId, userId);
  if (row.state !== 'in_progress') throw httpError(400, 'Parcours terminé.');

  const nodes = parseJson(row.nodes_json, []);
  const idx = findAvailableIndex(nodes);
  if (idx < 0) throw httpError(400, 'Aucun nœud disponible.');

  const node = nodes[idx];
  if (node.status !== 'available') throw httpError(400, 'Nœud verrouillé.');

  row.current_node_index = idx;

  if (node.type === 'combat') {
    if (row.current_combat_id) {
      const existing = await query(
        'SELECT id, state FROM combat_sessions WHERE id = ? AND user_id = ? LIMIT 1',
        [row.current_combat_id, userId]
      );
      if (existing[0]?.state === 'in_progress') {
        const { getCombatState } = await import('./combatEngineService.js');
        const combat = await getCombatState(userId, row.current_combat_id);
        await persistRun(row);
        return { run: serializeRun(row), combat, node };
      }
    }

    const player = parseJson(row.player_run_state_json, {});
    const { startCombat } = await import('./combatEngineService.js');
    const combat = await startCombat(userId, {
      missionId: row.mission_id,
      deckId: row.deck_id,
      templateId: node.templateId,
      difficulty: node.difficulty || 1,
      missionRunId: row.id,
      startingHp: player.hp,
      startingMaxHp: player.maxHp,
      suppressRewards: true,
    });

    row.current_combat_id = combat.id;
    row.nodes_json = nodes;
    await persistRun(row);

    return { run: serializeRun(row), combat, node };
  }

  // Événement : persister son ouverture pour pouvoir restaurer les choix après rechargement.
  nodes[idx] = { ...node, eventOpen: true };
  const eventPayload = buildEventPayload(nodes[idx], parseJson(row.player_run_state_json, {}));
  row.nodes_json = nodes;
  await persistRun(row);
  return { run: serializeRun(row), combat: null, node: nodes[idx], event: eventPayload };
}

function buildEventPayload(node, player) {
  const meta = EVENT_META[node.eventType] || EVENT_META.rest;
  const base = {
    eventType: node.eventType,
    nameFr: meta.nameFr,
    nameEn: meta.nameEn,
    descriptionFr: meta.descriptionFr,
    descriptionEn: meta.descriptionEn,
    scrap: player.scrap || 0,
    hp: player.hp,
    maxHp: player.maxHp,
  };

  if (node.eventType === 'rest') {
    return {
      ...base,
      choices: [
        { id: 'meditate', labelFr: 'Méditer (+30 % PV max)', labelEn: 'Meditate (+30% max HP)' },
      ],
    };
  }
  if (node.eventType === 'cache') {
    return {
      ...base,
      choices: [
        {
          id: 'search',
          labelFr: 'Fouiller (soin léger + ferraille)',
          labelEn: 'Search (light heal + scrap)',
        },
      ],
    };
  }
  if (node.eventType === 'merchant') {
    return {
      ...base,
      choices: [
        {
          id: 'buy_bandage',
          labelFr: 'Bandage (3 ferraille → +25 % PV)',
          labelEn: 'Bandage (3 scrap → +25% HP)',
          cost: 3,
          disabled: (player.scrap || 0) < 3,
        },
        {
          id: 'buy_tonic',
          labelFr: 'Tonique (5 ferraille → +50 % PV)',
          labelEn: 'Tonic (5 scrap → +50% HP)',
          cost: 5,
          disabled: (player.scrap || 0) < 5,
        },
        {
          id: 'leave',
          labelFr: 'Partir sans acheter',
          labelEn: 'Leave without buying',
        },
      ],
    };
  }
  if (node.eventType === 'crossroads') {
    return {
      ...base,
      choices: [
        {
          id: 'heal_path',
          labelFr: 'Sentier de soins (+25 % PV)',
          labelEn: 'Healing path (+25% HP)',
        },
        { id: 'scrap_path', labelFr: 'Sentier de ferraille (+4)', labelEn: 'Scrap path (+4)' },
      ],
    };
  }
  if (node.eventType === 'whisper_grove') {
    return {
      ...base,
      choices: [
        {
          id: 'listen',
          labelFr: 'Écouter les murmures (+28 % PV)',
          labelEn: 'Listen to the whispers (+28% HP)',
        },
        {
          id: 'gather',
          labelFr: 'Cueillir des herbes (+3 ferraille)',
          labelEn: 'Gather herbs (+3 scrap)',
        },
      ],
    };
  }
  if (node.eventType === 'crow_perch') {
    return {
      ...base,
      choices: [
        {
          id: 'offer_scrap',
          labelFr: 'Offrir 2 ferraille → +35 % PV',
          labelEn: 'Offer 2 scrap → +35% HP',
          cost: 2,
          disabled: (player.scrap || 0) < 2,
        },
        {
          id: 'scare_away',
          labelFr: 'Effrayer le corbeau (+2 ferraille)',
          labelEn: 'Scare the crow (+2 scrap)',
        },
      ],
    };
  }
  if (node.eventType === 'sealed_scroll') {
    return {
      ...base,
      choices: [
        {
          id: 'read_scroll',
          labelFr: 'Lire le sceau (+22 % PV)',
          labelEn: 'Read the seal (+22% HP)',
        },
        {
          id: 'break_seal',
          labelFr: 'Briser le sceau (+5 ferraille)',
          labelEn: 'Break the seal (+5 scrap)',
        },
      ],
    };
  }
  if (node.eventType === 'mist_bridge') {
    return {
      ...base,
      choices: [
        {
          id: 'careful_cross',
          labelFr: 'Traverser avec soin (+20 % PV)',
          labelEn: 'Cross carefully (+20% HP)',
        },
        {
          id: 'sprint_cross',
          labelFr: 'Courir sur les planches (+3 ferraille, +8 % PV)',
          labelEn: 'Sprint the planks (+3 scrap, +8% HP)',
        },
      ],
    };
  }
  if (node.eventType === 'spirit_lantern') {
    return {
      ...base,
      choices: [
        {
          id: 'light_lantern',
          labelFr: 'Allumer la lanterne (+18 % PV, +1 ferraille)',
          labelEn: 'Light the lantern (+18% HP, +1 scrap)',
        },
        {
          id: 'leave_dark',
          labelFr: 'Laisser l’ombre (rien)',
          labelEn: 'Leave the shadow (nothing)',
        },
      ],
    };
  }
  if (node.eventType === 'ash_camp') {
    return {
      ...base,
      choices: [
        {
          id: 'rest_hearth',
          labelFr: 'Se reposer au foyer (+32 % PV)',
          labelEn: 'Rest by the hearth (+32% HP)',
        },
        {
          id: 'sift_ashes',
          labelFr: 'Fouiller les cendres (+4 ferraille, +10 % PV)',
          labelEn: 'Sift the ashes (+4 scrap, +10% HP)',
        },
      ],
    };
  }
  // fallback
  return {
    ...base,
    choices: [
      {
        id: 'heal_path',
        labelFr: 'Sentier de soins (+25 % PV)',
        labelEn: 'Healing path (+25% HP)',
      },
      { id: 'scrap_path', labelFr: 'Sentier de ferraille (+4)', labelEn: 'Scrap path (+4)' },
    ],
  };
}

/**
 * Résout un événement (choix joueur) et avance le parcours.
 */
export async function resolveEvent(userId, runId, choiceId) {
  const row = await loadRunRow(runId, userId);
  if (row.state !== 'in_progress') throw httpError(400, 'Parcours terminé.');

  const nodes = parseJson(row.nodes_json, []);
  const idx = Number(row.current_node_index) || 0;
  const node = nodes[idx];
  if (!node || node.type !== 'event' || node.status !== 'available' || !node.eventOpen) {
    throw httpError(400, 'Aucun événement à résoudre.');
  }
  if (!choiceId) throw httpError(400, 'choiceId requis.');

  let player = parseJson(row.player_run_state_json, {});
  const log = { choiceId, eventType: node.eventType };

  switch (node.eventType) {
    case 'rest': {
      player = healPercent(player, 0.3);
      log.heal = player.lastHeal;
      break;
    }
    case 'cache': {
      player = healPercent(player, 0.12);
      player = { ...player, scrap: (player.scrap || 0) + 2 };
      log.heal = player.lastHeal;
      log.scrapGained = 2;
      break;
    }
    case 'merchant': {
      if (choiceId === 'buy_bandage') {
        if ((player.scrap || 0) < 3) throw httpError(400, 'Pas assez de ferraille.');
        player = healPercent({ ...player, scrap: player.scrap - 3 }, 0.25);
        log.heal = player.lastHeal;
        log.scrapSpent = 3;
      } else if (choiceId === 'buy_tonic') {
        if ((player.scrap || 0) < 5) throw httpError(400, 'Pas assez de ferraille.');
        player = healPercent({ ...player, scrap: player.scrap - 5 }, 0.5);
        log.heal = player.lastHeal;
        log.scrapSpent = 5;
      } else if (choiceId === 'leave') {
        log.skipped = true;
      } else {
        throw httpError(400, 'Choix marchand invalide.');
      }
      break;
    }
    case 'crossroads': {
      if (choiceId === 'heal_path') {
        player = healPercent(player, 0.25);
        log.heal = player.lastHeal;
      } else if (choiceId === 'scrap_path') {
        player = { ...player, scrap: (player.scrap || 0) + 4 };
        log.scrapGained = 4;
      } else {
        throw httpError(400, 'Choix de carrefour invalide.');
      }
      break;
    }
    case 'whisper_grove': {
      if (choiceId === 'listen') {
        player = healPercent(player, 0.28);
        log.heal = player.lastHeal;
      } else if (choiceId === 'gather') {
        player = { ...player, scrap: (player.scrap || 0) + 3 };
        log.scrapGained = 3;
      } else {
        throw httpError(400, 'Choix du bosquet invalide.');
      }
      break;
    }
    case 'crow_perch': {
      if (choiceId === 'offer_scrap') {
        if ((player.scrap || 0) < 2) throw httpError(400, 'Pas assez de ferraille.');
        player = healPercent({ ...player, scrap: player.scrap - 2 }, 0.35);
        log.heal = player.lastHeal;
        log.scrapSpent = 2;
      } else if (choiceId === 'scare_away') {
        player = { ...player, scrap: (player.scrap || 0) + 2 };
        log.scrapGained = 2;
      } else {
        throw httpError(400, 'Choix du perchoir invalide.');
      }
      break;
    }
    case 'sealed_scroll': {
      if (choiceId === 'read_scroll') {
        player = healPercent(player, 0.22);
        log.heal = player.lastHeal;
      } else if (choiceId === 'break_seal') {
        player = { ...player, scrap: (player.scrap || 0) + 5 };
        log.scrapGained = 5;
      } else {
        throw httpError(400, 'Choix du parchemin invalide.');
      }
      break;
    }
    case 'mist_bridge': {
      if (choiceId === 'careful_cross') {
        player = healPercent(player, 0.2);
        log.heal = player.lastHeal;
      } else if (choiceId === 'sprint_cross') {
        player = healPercent(player, 0.08);
        player = { ...player, scrap: (player.scrap || 0) + 3 };
        log.heal = player.lastHeal;
        log.scrapGained = 3;
      } else {
        throw httpError(400, 'Choix du pont invalide.');
      }
      break;
    }
    case 'spirit_lantern': {
      if (choiceId === 'light_lantern') {
        player = healPercent(player, 0.18);
        player = { ...player, scrap: (player.scrap || 0) + 1 };
        log.heal = player.lastHeal;
        log.scrapGained = 1;
      } else if (choiceId === 'leave_dark') {
        log.skipped = true;
      } else {
        throw httpError(400, 'Choix de la lanterne invalide.');
      }
      break;
    }
    case 'ash_camp': {
      if (choiceId === 'rest_hearth') {
        player = healPercent(player, 0.32);
        log.heal = player.lastHeal;
      } else if (choiceId === 'sift_ashes') {
        player = healPercent(player, 0.1);
        player = { ...player, scrap: (player.scrap || 0) + 4 };
        log.heal = player.lastHeal;
        log.scrapGained = 4;
      } else {
        throw httpError(400, 'Choix du campement invalide.');
      }
      break;
    }
    default:
      player = healPercent(player, 0.2);
      log.heal = player.lastHeal;
  }

  delete player.lastHeal;
  nodes[idx] = { ...node, resolved: log };
  const nextNodes = unlockNext(nodes, idx);
  const availableIdx = nextNodes.findIndex(n => n.status === 'available');
  const allCleared = nextNodes.every(n => n.status === 'cleared');

  row.nodes_json = nextNodes;
  row.player_run_state_json = player;
  row.current_node_index = availableIdx >= 0 ? availableIdx : idx;
  row.current_combat_id = null;

  if (allCleared || availableIdx < 0) {
    await completeRunVictory(row);
  } else {
    await persistRun(row);
  }

  return serializeRun(row, { lastEvent: log });
}

async function completeRunVictory(row) {
  row.state = 'victory';
  row.current_combat_id = null;
  try {
    const rewards = await grantRunRewards(row.user_id, row.mission_id, {
      combatsWon: parseJson(row.player_run_state_json, {}).combatsWon || 0,
      nodeCount: parseJson(row.nodes_json, []).length,
    });
    row.rewards_json = rewards;
  } catch (err) {
    row.rewards_json = { error: true, message: err.message };
  }
  await persistRun(row);

  // Quêtes BP : parcours terminé (+ rang B+ si applicable)
  try {
    const { onBattlePassAction, isMissionRankBOrHigher } =
      await import('./battlePassQuestService.js');
    await onBattlePassAction(row.user_id, 'mission_run', 1);
    const mission = await getMission(row.mission_id);
    if (isMissionRankBOrHigher(mission?.rank)) {
      await onBattlePassAction(row.user_id, 'mission_rank_b', 1);
    }
  } catch {
    /* BP optionnel */
  }

  try {
    const { onAchievementAction } = await import('./achievementService.js');
    await onAchievementAction(row.user_id, 'mission_run', 1);
  } catch {
    /* exploits optionnels */
  }
}

/**
 * Hook appelé par le moteur de combat quand un combat lié à un run se termine.
 */
export async function onRunCombatFinished(session) {
  if (!session?.missionRunId || !session.userId) return null;

  let row;
  try {
    row = await loadRunRow(session.missionRunId, session.userId);
  } catch {
    return null;
  }
  if (row.state !== 'in_progress') return serializeRun(row);

  // Ne traiter qu'une fois
  if (row.current_combat_id && row.current_combat_id !== session.id) {
    // Combat obsolète
    return serializeRun(row);
  }

  const nodes = parseJson(row.nodes_json, []);
  const idx = Number(row.current_node_index) || 0;
  let player = parseJson(row.player_run_state_json, {});

  if (session.state === 'victory') {
    const hp = Math.max(1, Number(session.player?.hp) || 1);
    const maxHp = Number(session.player?.maxHp) || player.maxHp;
    player = {
      ...player,
      hp: clampHp(hp, maxHp),
      maxHp,
      scrap: (player.scrap || 0) + 2,
      combatsWon: (player.combatsWon || 0) + 1,
    };

    const nextNodes = unlockNext(nodes, idx);
    row.nodes_json = nextNodes;
    row.player_run_state_json = player;
    row.current_combat_id = null;

    const availableIdx = nextNodes.findIndex(n => n.status === 'available');
    const allCleared = nextNodes.every(n => n.status === 'cleared');

    if (allCleared || availableIdx < 0) {
      row.current_node_index = idx;
      await completeRunVictory(row);
    } else {
      row.current_node_index = availableIdx;
      await persistRun(row);
    }
    return serializeRun(row);
  }

  // Défaite / abandon combat → échec du run
  if (session.state === 'defeat' || session.state === 'forfeited') {
    player = {
      ...player,
      hp: Math.max(0, Number(session.player?.hp) || 0),
    };
    row.player_run_state_json = player;
    row.state = 'defeat';
    row.current_combat_id = null;
    row.rewards_json = null;
    if (nodes[idx]) {
      nodes[idx] = { ...nodes[idx], status: 'failed' };
      row.nodes_json = nodes;
    }
    await persistRun(row);
    return serializeRun(row);
  }

  return serializeRun(row);
}

export async function abandonRun(userId, runId) {
  const row = await loadRunRow(runId, userId);
  if (row.state !== 'in_progress') throw httpError(400, 'Parcours déjà terminé.');

  if (row.current_combat_id) {
    try {
      const { forfeit } = await import('./combatEngineService.js');
      await forfeit(userId, row.current_combat_id);
    } catch {
      /* combat peut déjà être terminé */
    }
  }

  row.state = 'abandoned';
  row.current_combat_id = null;
  await persistRun(row);
  return serializeRun(row);
}

export const __test = {
  buildRunNodes,
  unlockNext,
  healPercent,
  getCurrentEvent,
  EVENT_TYPES,
  EVENT_META,
};
