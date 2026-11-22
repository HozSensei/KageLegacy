/**
 * Mission runs — parcours branché (bourse + inventaire + shop).
 *
 * Flux :
 *   startRun (purseStake) → path branché
 *   enterNode → combat | shop | rest | branch
 *   shopBuy / inventoryUse / inventoryDiscard / chooseBranch
 *   onRunCombatFinished → PV + gains bourse ; mort = échec
 *   Fin → crédit bourse + loot scellé
 */
import { randomUUID } from 'node:crypto';
import { query } from '../config/database.js';
import {
  HARD_MODE_DIFFICULTY_MULT,
  HARD_MODE_REWARD_MULT,
} from '../config/missionPathConfig.js';
import {
  PURSE_STAKES,
  isValidPurseStake,
  getShopItem,
} from '../config/missionRunEconomy.js';
import {
  applyHardModeToNodes,
  buildMysteryOutcome,
  buildRandomRunPath,
  buildRunNodes,
  ensureRecoveryMystery,
  isRecoveryOutcome,
  pickEncountersForRank,
} from './missionPathBuilder.js';
import {
  createRunPlayerState,
  getPurse,
  grantCombatPurse,
  grantNodePurse,
  healPercent,
  placeInventoryItem,
  discardInventorySlot,
  spendPurse,
  useInventorySlot,
  collectPendingCardsFromInventory,
} from './missionRunInventory.js';
import { BASE_MAX_HP } from './deckCombat/constants.js';
import { createEmptyStats, getCharacter, getComputedStats } from './playerCharacterService.js';
import { grantRunRewards } from './combatRewardService.js';
import { getMission } from './combatMissionService.js';
import {
  canPlayMissionRank,
  requiredCharacterRankForMission,
} from './missionRankAccess.js';
import { pickRankVignette } from '../../scripts/data/missionLore.js';
import { addCard } from './collectionService.js';

export { applyHardModeToNodes, buildRandomRunPath, buildRunNodes } from './missionPathBuilder.js';

const EVENT_TYPES = [
  'rest',
  'merchant',
  'shop',
  'branch',
  'mystery_heal',
  'mystery_loot',
  'mystery_nothing',
];

const EVENT_META = {
  rest: {
    id: 'rest',
    nameFr: 'Halte de récupération',
    nameEn: 'Recovery Halt',
    descriptionFr: 'Un abri discret. Reposez-vous pour récupérer des forces.',
    descriptionEn: 'A discreet shelter. Rest to recover strength.',
  },
  shop: {
    id: 'shop',
    nameFr: 'Colporteur d’Ombre',
    nameEn: 'Shadow Peddler',
    descriptionFr: 'Achetez des soins, sceaux ou parchemins scellés avec votre bourse de mission.',
    descriptionEn: 'Buy heals, seals, or sealed scrolls with your mission purse.',
  },
  merchant: {
    id: 'merchant',
    nameFr: 'Colporteur d’Ombre',
    nameEn: 'Shadow Peddler',
    descriptionFr: 'Achetez des soins, sceaux ou parchemins scellés avec votre bourse de mission.',
    descriptionEn: 'Buy heals, seals, or sealed scrolls with your mission purse.',
  },
  branch: {
    id: 'branch',
    nameFr: 'Carrefour du Voile',
    nameEn: 'Veil Crossroads',
    descriptionFr: 'Deux sentiers. Le long rapporte plus d’XP, le court est plus sûr.',
    descriptionEn: 'Two paths. The long one pays more XP; the short one is safer.',
  },
  mystery_heal: {
    id: 'mystery_heal',
    nameFr: 'Halte providentielle',
    nameEn: 'Fortunate Halt',
    descriptionFr: 'Un abri discret. Vous pouvez reprendre votre souffle.',
    descriptionEn: 'A discreet shelter. You can catch your breath.',
  },
  mystery_loot: {
    id: 'mystery_loot',
    nameFr: 'Cache improvisée',
    nameEn: 'Improvised Stash',
    descriptionFr: 'Quelques Ryos de mission abandonnés sur le sentier.',
    descriptionEn: 'Some mission purse coins left by the path.',
  },
  mystery_nothing: {
    id: 'mystery_nothing',
    nameFr: 'Sentier tranquille',
    nameEn: 'Quiet Path',
    descriptionFr: 'Rien d’autre que le vent dans les pins. La route continue.',
    descriptionEn: 'Nothing but wind in the pines. The road goes on.',
  },
};

function httpError(statusCode, message, code = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
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
      [tableName],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

export function sanitizeNodesForClient(nodes) {
  if (!Array.isArray(nodes)) return [];
  return nodes.map(node => {
    if (node?.type === 'shop' && node.status === 'locked') {
      const { offer, ...rest } = node;
      return { ...rest, hasOffer: Boolean(offer?.length) };
    }
    if (node?.type === 'mystery' && !node.revealed) {
      return { id: node.id, type: 'mystery', status: node.status, revealed: false };
    }
    return node;
  });
}

function findAvailableIndex(nodes) {
  const idx = nodes.findIndex(n => n.status === 'available');
  return idx >= 0 ? idx : -1;
}

function isTerminalStatus(status) {
  return status === 'cleared' || status === 'skipped';
}

/**
 * Débloque le nœud suivant via nextNodeId (ou index+1 en legacy).
 */
export function unlockNext(nodes, clearedIndex, { chosenNextId = null } = {}) {
  const next = nodes.map(n => ({ ...n }));
  next[clearedIndex] = { ...next[clearedIndex], status: 'cleared' };
  const targetId = chosenNextId || next[clearedIndex].nextNodeId;
  if (targetId) {
    const targetIdx = next.findIndex(n => n.id === targetId);
    if (targetIdx >= 0 && next[targetIdx].status === 'locked') {
      next[targetIdx] = { ...next[targetIdx], status: 'available' };
    }
    return next;
  }
  if (clearedIndex + 1 < next.length && next[clearedIndex + 1].status === 'locked') {
    next[clearedIndex + 1] = { ...next[clearedIndex + 1], status: 'available' };
  }
  return next;
}

/** Ids atteignables depuis startId via nextNodeId et choices (toutes branches). */
function collectSubtreeIds(nodesById, startId) {
  const ids = new Set();
  if (!startId) return ids;
  const stack = [startId];
  while (stack.length) {
    const id = stack.pop();
    if (!id || ids.has(id)) continue;
    const node = nodesById[id];
    if (!node) continue;
    ids.add(id);
    if (node.type === 'branch') {
      for (const c of node.choices || []) {
        if (c?.nextNodeId) stack.push(c.nextNodeId);
      }
    } else if (node.nextNodeId) {
      stack.push(node.nextNodeId);
    }
  }
  return ids;
}

/**
 * Applique un choix de carrefour : saute les sous-arbres des autres choix
 * (N branches, y compris sous-carrefours imbriqués).
 */
function applyBranchChoice(nodes, branchIndex, choiceId) {
  const next = nodes.map(n => ({ ...n }));
  const branchNode = next[branchIndex];
  const choice = (branchNode.choices || []).find(c => c.id === choiceId);
  if (!choice) throw httpError(400, 'Choix de branche invalide.');

  next[branchIndex] = { ...branchNode, status: 'cleared', chosen: choiceId };
  const byId = Object.fromEntries(next.map(n => [n.id, n]));
  const keep = collectSubtreeIds(byId, choice.nextNodeId);

  for (const other of branchNode.choices || []) {
    if (other.id === choiceId) continue;
    for (const id of collectSubtreeIds(byId, other.nextNodeId)) {
      if (keep.has(id)) continue;
      const idx = next.findIndex(n => n.id === id);
      if (idx >= 0 && next[idx].status !== 'cleared') {
        next[idx] = { ...next[idx], status: 'skipped' };
      }
    }
  }

  const targetIdx = next.findIndex(n => n.id === choice.nextNodeId);
  if (targetIdx >= 0) {
    next[targetIdx] = { ...next[targetIdx], status: 'available' };
  }
  return {
    nodes: next,
    xpMult: Number(choice.xpMult) || 1,
    branchId: choiceId,
  };
}

function clampHp(hp, maxHp) {
  return Math.max(1, Math.min(maxHp, Math.floor(hp)));
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

function isOpenPanelNode(node) {
  if (!node || node.status !== 'available' || !node.eventOpen) return false;
  return ['shop', 'rest', 'branch', 'mystery', 'event', 'merchant'].includes(node.type);
}

function buildEventPayload(node, player) {
  const eventType =
    node.eventType ||
    (node.type === 'shop'
      ? 'shop'
      : node.type === 'rest'
        ? 'rest'
        : node.type === 'branch'
          ? 'branch'
          : node.type === 'merchant'
            ? 'shop'
            : 'rest');
  const meta = EVENT_META[eventType] || EVENT_META.rest;
  const base = {
    eventType,
    nameFr: meta.nameFr,
    nameEn: meta.nameEn,
    descriptionFr: meta.descriptionFr,
    descriptionEn: meta.descriptionEn,
    purse: getPurse(player),
    contraband: getPurse(player), // compat UI legacy
    hp: player.hp,
    maxHp: player.maxHp,
    inventory: player.inventory || [],
  };

  if (eventType === 'shop' || node.type === 'shop' || node.type === 'merchant') {
    return {
      ...base,
      eventType: 'shop',
      offer: node.offer || [],
      choices: [
        { id: 'leave', labelFr: 'Quitter la boutique', labelEn: 'Leave the shop' },
      ],
    };
  }
  if (eventType === 'rest' || node.type === 'rest') {
    return {
      ...base,
      choices: [
        { id: 'rest_here', labelFr: 'Se reposer (+40 % PV max)', labelEn: 'Rest (+40% max HP)' },
      ],
    };
  }
  if (eventType === 'branch' || node.type === 'branch') {
    return {
      ...base,
      choices: (node.choices || []).map(c => ({
        id: c.id,
        labelFr: c.labelFr,
        labelEn: c.labelEn,
        lengthHint: c.lengthHint,
        xpMult: c.xpMult,
        fightCount: c.fightCount,
      })),
    };
  }
  if (eventType === 'mystery_heal') {
    return {
      ...base,
      choices: [
        { id: 'rest_here', labelFr: 'Se reposer (+50 % PV max)', labelEn: 'Rest (+50% max HP)' },
      ],
    };
  }
  if (eventType === 'mystery_loot') {
    return {
      ...base,
      choices: [
        {
          id: 'take_scrap',
          labelFr: 'Ramasser (+40 bourse, +10 % PV)',
          labelEn: 'Take it (+40 purse, +10% HP)',
        },
      ],
    };
  }
  return {
    ...base,
    choices: [{ id: 'continue', labelFr: 'Continuer', labelEn: 'Continue' }],
  };
}

function getCurrentEvent(row, nodes, player) {
  if (row.state !== 'in_progress') return null;
  const node = nodes[Number(row.current_node_index)];
  if (!isOpenPanelNode(node)) return null;
  return buildEventPayload(node, player);
}

function serializeRun(row, extras = {}) {
  if (!row) return null;
  const nodes = parseJson(row.nodes_json, []);
  const player = parseJson(row.player_run_state_json, {});
  const lore = player.lore || null;
  const missionExtra = extras.mission
    ? {
        ...extras.mission,
        briefFr: lore?.briefFr || extras.mission.briefFr || null,
        briefEn: lore?.briefEn || extras.mission.briefEn || null,
        epilogueFr: lore?.epilogueFr || extras.mission.epilogueFr || null,
        epilogueEn: lore?.epilogueEn || extras.mission.epilogueEn || null,
      }
    : extras.mission;

  const restExtras = { ...extras };
  delete restExtras.mission;

  return {
    id: row.id,
    userId: row.user_id,
    missionId: row.mission_id,
    deckId: row.deck_id,
    state: row.state,
    currentNodeIndex: row.current_node_index,
    nodes: sanitizeNodesForClient(nodes),
    player: {
      ...player,
      purse: getPurse(player),
      contraband: getPurse(player),
    },
    hardMode: Boolean(player.hardMode),
    currentEvent: getCurrentEvent(row, nodes, player),
    stats: parseJson(row.stats_snapshot_json, createEmptyStats()),
    talentEffects: parseJson(row.talent_effects_json, { codes: [], applied: [], stubbed: [] }),
    currentCombatId: row.current_combat_id || null,
    rewards: parseJson(row.rewards_json, null),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(missionExtra ? { mission: missionExtra } : {}),
    ...restExtras,
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
    ],
  );
}

async function debitPurseStake(userId, stake) {
  const amount = Number(stake) || 0;
  if (amount <= 0) return;
  const profile = await query('SELECT ryos FROM player_profiles WHERE user_id = ? LIMIT 1', [
    userId,
  ]);
  if (!profile[0]) throw httpError(400, 'Profil introuvable.');
  if (Number(profile[0].ryos) < amount) {
    throw httpError(400, `Ryos insuffisants (${profile[0].ryos}/${amount}).`, 'INSUFFICIENT_RYOS');
  }
  await query('UPDATE player_profiles SET ryos = ryos - ? WHERE user_id = ?', [amount, userId]);
}

async function pickCardIdByRarity(rarity, rng = Math.random) {
  const rows = await query(
    'SELECT id FROM card_definitions WHERE rarity = ? ORDER BY RAND() LIMIT 30',
    [rarity],
  );
  if (!rows.length) {
    const fallback = await query(
      'SELECT id FROM card_definitions WHERE rarity = \'common\' ORDER BY RAND() LIMIT 20',
    );
    if (!fallback.length) return null;
    return fallback[Math.floor(rng() * fallback.length)].id;
  }
  return rows[Math.floor(rng() * rows.length)].id;
}

function pickMissionPublic(mission) {
  if (!mission) return null;
  return {
    id: mission.id,
    slug: mission.slug,
    nameFr: mission.nameFr,
    nameEn: mission.nameEn,
    rank: mission.rank,
    rewards: mission.rewards,
    chapterFr: mission.chapterFr || null,
    chapterEn: mission.chapterEn || null,
    briefFr: mission.briefFr || mission.descriptionFr || null,
    briefEn: mission.briefEn || mission.descriptionEn || null,
    epilogueFr: mission.epilogueFr || null,
    epilogueEn: mission.epilogueEn || null,
  };
}

export async function startRun(userId, missionId, deckId = null, opts = {}) {
  if (!userId) throw httpError(400, 'userId requis.');
  if (!(await tableExists('mission_runs'))) {
    throw httpError(503, 'Tables mission_runs absentes — lancez les migrations (106).');
  }

  const hardMode = Boolean(opts?.hardMode);
  const purseStake = isValidPurseStake(opts?.purseStake) ? Number(opts.purseStake) : 0;

  const active = await query(
    "SELECT id FROM mission_runs WHERE user_id = ? AND state = 'in_progress' LIMIT 1",
    [userId],
  );
  if (active[0]) {
    throw httpError(409, `Parcours déjà en cours (${active[0].id}). Terminez-le ou abandonnez-le.`);
  }

  const activeCombat = await query(
    "SELECT id FROM combat_sessions WHERE user_id = ? AND state = 'in_progress' LIMIT 1",
    [userId],
  );
  if (activeCombat[0]) {
    throw httpError(409, `Combat déjà en cours (${activeCombat[0].id}).`);
  }

  const mission = await getMission(missionId);
  const character = await getCharacter(userId);
  if (!character) throw httpError(400, 'Créez un personnage avant de lancer une mission.');
  if (!canPlayMissionRank(character.rank, mission.rank)) {
    const required = requiredCharacterRankForMission(mission.rank);
    throw httpError(403, `Rang ${required} requis pour les missions ${mission.rank}.`);
  }

  await debitPurseStake(userId, purseStake);

  const { getPlayableDeckForCombat } = await import('./deckService.js');
  const deck = await getPlayableDeckForCombat(userId, deckId);
  const [{ total: stats }, effectCodes] = await Promise.all([
    getComputedStats(userId, { deckPassives: deck.passiveBonuses }),
    loadTalentEffectCodes(userId),
  ]);

  const { classifyTalentEffects } = await import('./deckCombat/talentEffects.js');
  const classified = classifyTalentEffects(effectCodes);
  const maxHp = BASE_MAX_HP + (Number(stats.maxHp) || 0);
  const nodes = buildRandomRunPath(mission.rank, { hardMode });
  const vignette = pickRankVignette(mission.rank);
  const id = randomUUID();
  const player = createRunPlayerState({
    maxHp,
    purseStake,
    hardMode,
    rewardMult: HARD_MODE_REWARD_MULT,
    lore: vignette,
  });

  await query(
    `INSERT INTO mission_runs
      (id, user_id, mission_id, deck_id, state, current_node_index, nodes_json,
       player_run_state_json, stats_snapshot_json, talent_effects_json, current_combat_id, rewards_json)
     VALUES (?, ?, ?, ?, 'in_progress', 0, ?, ?, ?, ?, NULL, NULL)`,
    [
      id,
      userId,
      mission.id,
      deck.id,
      JSON.stringify(nodes),
      JSON.stringify(player),
      JSON.stringify(stats),
      JSON.stringify({
        codes: effectCodes,
        applied: classified.applied,
        stubbed: classified.stubbed,
      }),
    ],
  );

  const row = await loadRunRow(id, userId);
  return serializeRun(row, { mission: pickMissionPublic(mission) });
}

export async function getRun(userId, runId) {
  const row = await loadRunRow(runId, userId);
  let mission = null;
  try {
    mission = await getMission(row.mission_id);
  } catch {
    /* ignore */
  }
  return serializeRun(row, { mission: pickMissionPublic(mission) });
}

export async function getActiveRun(userId) {
  const rows = await query(
    "SELECT * FROM mission_runs WHERE user_id = ? AND state = 'in_progress' ORDER BY created_at DESC LIMIT 1",
    [userId],
  );
  if (!rows[0]) return null;
  return getRun(userId, rows[0].id);
}

async function advanceAfterClear(row, nodes, player, clearedIndex) {
  const nextNodes = unlockNext(nodes, clearedIndex);
  const availableIdx = nextNodes.findIndex(n => n.status === 'available');
  const allCleared = nextNodes.every(n => isTerminalStatus(n.status));

  row.nodes_json = nextNodes;
  row.player_run_state_json = player;
  row.current_combat_id = null;

  if (allCleared || availableIdx < 0) {
    row.current_node_index = clearedIndex;
    await completeRunVictory(row);
  } else {
    row.current_node_index = availableIdx;
    await persistRun(row);
  }
  return serializeRun(row);
}

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
        [row.current_combat_id, userId],
      );
      if (existing[0]?.state === 'in_progress') {
        const { getCombatState } = await import('./combatEngineService.js');
        const combat = await getCombatState(userId, row.current_combat_id);
        row.nodes_json = nodes;
        await persistRun(row);
        return {
          run: serializeRun(row),
          combat,
          node: sanitizeNodesForClient([node])[0],
        };
      }
    }

    const player = parseJson(row.player_run_state_json, {});
    const mods = player.nextCombatMods || {};
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
      runCombatMods: {
        block: Number(mods.block) || 0,
        chakra: Number(mods.chakra) || 0,
        damagePct: (Number(mods.damagePct) || 0) + (Number(player.runMods?.damagePct) || 0),
      },
    });

    // Consommer les mods « prochain combat »
    player.nextCombatMods = {};
    row.player_run_state_json = player;
    row.current_combat_id = combat.id;
    row.nodes_json = nodes;
    await persistRun(row);

    return {
      run: serializeRun(row),
      combat,
      node: sanitizeNodesForClient([node])[0],
    };
  }

  // shop / rest / branch / mystery
  const eventType =
    node.type === 'shop'
      ? 'shop'
      : node.type === 'rest'
        ? 'rest'
        : node.type === 'branch'
          ? 'branch'
          : node.eventType || 'rest';
  const meta = EVENT_META[eventType] || EVENT_META.rest;
  nodes[idx] = {
    ...node,
    eventOpen: true,
    eventType,
    nameFr: meta.nameFr,
    nameEn: meta.nameEn,
    descriptionFr: meta.descriptionFr,
    descriptionEn: meta.descriptionEn,
  };
  const eventPayload = buildEventPayload(nodes[idx], parseJson(row.player_run_state_json, {}));
  row.nodes_json = nodes;
  await persistRun(row);
  return {
    run: serializeRun(row),
    combat: null,
    node: sanitizeNodesForClient([nodes[idx]])[0],
    event: eventPayload,
  };
}

export async function shopBuy(userId, runId, itemId, { replaceSlot = null } = {}) {
  const row = await loadRunRow(runId, userId);
  if (row.state !== 'in_progress') throw httpError(400, 'Parcours terminé.');
  const nodes = parseJson(row.nodes_json, []);
  const idx = Number(row.current_node_index) || 0;
  const node = nodes[idx];
  if (!node || node.status !== 'available' || (node.type !== 'shop' && node.type !== 'merchant')) {
    throw httpError(400, 'Boutique non disponible.');
  }
  if (!node.eventOpen) throw httpError(400, 'Entrez d’abord dans la boutique.');

  const offer = Array.isArray(node.offer) ? [...node.offer] : [];
  const offerIdx = offer.findIndex(item => item.id === itemId);
  if (offerIdx < 0) throw httpError(404, 'Article introuvable.');
  const offerItem = offer[offerIdx];
  if ((offerItem.stock ?? 1) <= 0) throw httpError(400, 'Article épuisé.');

  const def = getShopItem(itemId);
  if (!def) throw httpError(404, 'Article inconnu.');

  let player = parseJson(row.player_run_state_json, {});
  const spent = spendPurse(player, def.price);
  if (!spent.ok) throw httpError(400, 'Bourse insuffisante.', spent.code);
  player = spent.player;

  const placed = placeInventoryItem(player.inventory, def, {
    replaceSlot: replaceSlot == null ? null : Number(replaceSlot),
    meta: def.kind === 'pending_card' ? { rarity: def.rarity } : null,
  });
  if (!placed.ok) throw httpError(400, 'Inventaire plein — jetez ou remplacez un objet.', placed.code);
  player.inventory = placed.inventory;

  offer[offerIdx] = { ...offerItem, stock: 0 };
  nodes[idx] = { ...node, offer };

  row.nodes_json = nodes;
  row.player_run_state_json = player;
  await persistRun(row);
  return serializeRun(row, {
    lastPurchase: { itemId: def.id, price: def.price, slot: placed.slot },
  });
}

export async function inventoryUse(userId, runId, slotIndex) {
  const row = await loadRunRow(runId, userId);
  if (row.state !== 'in_progress') throw httpError(400, 'Parcours terminé.');
  if (row.current_combat_id) {
    throw httpError(400, 'Impossible d’utiliser un objet pendant un combat.');
  }
  const player = parseJson(row.player_run_state_json, {});
  const result = useInventorySlot(player, Number(slotIndex));
  if (!result.ok) {
    const messages = {
      EMPTY_SLOT: 'Emplacement vide.',
      SEALED_UNTIL_FINISH: 'Parchemin scellé — révélation à la fin du parcours.',
      NOT_USABLE: 'Objet non utilisable.',
    };
    throw httpError(400, messages[result.code] || 'Utilisation impossible.', result.code);
  }
  row.player_run_state_json = result.player;
  await persistRun(row);
  return serializeRun(row, { lastUse: result.log });
}

export async function inventoryDiscard(userId, runId, slotIndex) {
  const row = await loadRunRow(runId, userId);
  if (row.state !== 'in_progress') throw httpError(400, 'Parcours terminé.');
  let player = parseJson(row.player_run_state_json, {});
  const result = discardInventorySlot(player.inventory, Number(slotIndex));
  if (!result.ok) throw httpError(400, 'Emplacement vide.', result.code);
  player = { ...player, inventory: result.inventory };
  row.player_run_state_json = player;
  await persistRun(row);
  return serializeRun(row);
}

export async function chooseBranch(userId, runId, choiceId) {
  const row = await loadRunRow(runId, userId);
  if (row.state !== 'in_progress') throw httpError(400, 'Parcours terminé.');
  const nodes = parseJson(row.nodes_json, []);
  const idx = Number(row.current_node_index) || 0;
  const node = nodes[idx];
  if (!node || node.type !== 'branch' || node.status !== 'available') {
    throw httpError(400, 'Bifurcation non disponible.');
  }

  let player = grantNodePurse(parseJson(row.player_run_state_json, {}));
  const applied = applyBranchChoice(nodes, idx, choiceId);
  player = {
    ...player,
    branchId: applied.branchId,
    branchXpMult: applied.xpMult,
  };

  row.nodes_json = applied.nodes;
  row.player_run_state_json = player;
  const availableIdx = applied.nodes.findIndex(n => n.status === 'available');
  row.current_node_index = availableIdx >= 0 ? availableIdx : idx;
  await persistRun(row);
  return serializeRun(row, { branchChosen: choiceId });
}

export async function resolveEvent(userId, runId, choiceId) {
  const row = await loadRunRow(runId, userId);
  if (row.state !== 'in_progress') throw httpError(400, 'Parcours terminé.');

  const nodes = parseJson(row.nodes_json, []);
  const idx = Number(row.current_node_index) || 0;
  const node = nodes[idx];
  if (!node || node.status !== 'available') throw httpError(400, 'Aucun événement ouvert.');

  // Branch uses dedicated endpoint but accept choice here too.
  if (node.type === 'branch') {
    return chooseBranch(userId, runId, choiceId);
  }

  let player = parseJson(row.player_run_state_json, {});
  const log = { choiceId, eventType: node.eventType || node.type };

  if (node.type === 'shop' || node.type === 'merchant' || choiceId === 'leave') {
    if (choiceId !== 'leave' && node.type === 'shop') {
      throw httpError(400, 'Utilisez l’achat boutique, puis quittez.');
    }
    player = grantNodePurse(player);
    log.leftShop = true;
  } else if (choiceId === 'rest_here') {
    const pct = node.type === 'rest' ? 0.4 : 0.5;
    player = healPercent(player, pct);
    log.heal = player.lastHeal;
    player = grantNodePurse(player);
  } else if (choiceId === 'take_scrap') {
    player = healPercent(player, 0.1);
    player = { ...player, purse: getPurse(player) + 40 };
    log.purseGained = 40;
  } else {
    player = grantNodePurse(player);
  }

  delete player.lastHeal;
  return advanceAfterClear(row, nodes, player, idx);
}

async function completeRunVictory(row) {
  row.state = 'victory';
  row.current_combat_id = null;
  try {
    const player = parseJson(row.player_run_state_json, {});
    const hardModeMult = player.hardMode
      ? Number(player.rewardMult) || HARD_MODE_REWARD_MULT
      : 1;
    const branchXpMult = Number(player.branchXpMult) || 1;
    const purseReturn = getPurse(player);

    const rewards = await grantRunRewards(row.user_id, row.mission_id, {
      combatsWon: player.combatsWon || 0,
      nodeCount: parseJson(row.nodes_json, []).filter(n => n.status === 'cleared').length,
      hardModeMult,
      branchXpMult,
      purseReturn,
    });

    // Grant sealed cards from inventory
    const pendingCards = collectPendingCardsFromInventory(player);
    const grantedCards = [];
    for (const entry of pendingCards) {
      const cardId = await pickCardIdByRarity(entry.rarity || 'common');
      if (!cardId) continue;
      try {
        const added = await addCard(row.user_id, cardId, {
          quantity: 1,
          source: 'mission_run_shop',
        });
        grantedCards.push({
          cardId,
          rarity: entry.rarity,
          collectionId: added?.id || null,
        });
      } catch {
        /* skip failed grant */
      }
    }
    rewards.purseReturned = purseReturn;
    rewards.shopCards = grantedCards;
    rewards.branchXpMult = branchXpMult;
    row.rewards_json = rewards;

    // Clear run inventory after commit
    row.player_run_state_json = {
      ...player,
      purse: 0,
      inventory: (player.inventory || []).map((slot, i) => ({
        slot: i,
        itemId: null,
        qty: 0,
        meta: null,
      })),
    };
  } catch (err) {
    row.rewards_json = { error: true, message: err.message };
  }
  await persistRun(row);

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

export async function onRunCombatFinished(session) {
  if (!session?.missionRunId || !session.userId) return null;

  let row;
  try {
    row = await loadRunRow(session.missionRunId, session.userId);
  } catch {
    return null;
  }
  if (row.state !== 'in_progress') return serializeRun(row);
  if (row.current_combat_id && row.current_combat_id !== session.id) {
    return serializeRun(row);
  }

  const nodes = parseJson(row.nodes_json, []);
  const idx = Number(row.current_node_index) || 0;
  let player = parseJson(row.player_run_state_json, {});

  if (session.state === 'victory') {
    const hp = Math.max(1, Number(session.player?.hp) || 1);
    const maxHp = Number(session.player?.maxHp) || player.maxHp;
    player = grantCombatPurse({
      ...player,
      hp: clampHp(hp, maxHp),
      maxHp,
      combatsWon: (player.combatsWon || 0) + 1,
    });
    return advanceAfterClear(row, nodes, player, idx);
  }

  if (session.state === 'defeat' || session.state === 'forfeited') {
    player = {
      ...player,
      hp: Math.max(0, Number(session.player?.hp) || 0),
      purse: 0,
      inventory: (player.inventory || []).map((slot, i) => ({
        slot: i,
        itemId: null,
        qty: 0,
        meta: null,
      })),
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

  const player = parseJson(row.player_run_state_json, {});
  row.player_run_state_json = {
    ...player,
    purse: 0,
    inventory: (player.inventory || []).map((slot, i) => ({
      slot: i,
      itemId: null,
      qty: 0,
      meta: null,
    })),
  };
  row.state = 'abandoned';
  row.current_combat_id = null;
  await persistRun(row);
  return serializeRun(row);
}

export const __test = {
  buildRunNodes,
  buildRandomRunPath,
  sanitizeNodesForClient,
  unlockNext,
  healPercent,
  getCurrentEvent,
  EVENT_TYPES,
  EVENT_META,
  pickEncountersForRank,
  buildMysteryOutcome,
  ensureRecoveryMystery,
  applyHardModeToNodes,
  isRecoveryOutcome,
  HARD_MODE_DIFFICULTY_MULT,
  HARD_MODE_REWARD_MULT,
  applyBranchChoice,
  PURSE_STAKES,
  createRunPlayerState,
  placeInventoryItem,
  useInventorySlot,
  getPurse,
};
