import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { parseApiResponse, readApiError } from '../utils/http.js';
import { usePlayerStore } from './player';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useTalentTreeStore = defineStore('talentTree', () => {
  const nodes = ref([]);
  const unlockedNodeIds = ref([]);
  const nodeRanks = ref({});
  const branchPoints = ref({});
  const spentPoints = ref(0);
  const talentPointsAvailable = ref(0);
  const level = ref(1);
  const effects = ref([]);
  const bonuses = ref(null);
  const respec = ref(null);
  const loading = ref(false);
  const actionLoading = ref(false);
  const error = ref(null);
  const selectedNodeId = ref(null);
  const branchFilter = ref('');
  const pendingSequence = ref([]);

  const pendingRanks = computed(() => {
    const result = {};
    for (const nodeId of pendingSequence.value) result[nodeId] = (result[nodeId] || 0) + 1;
    return result;
  });
  const effectiveRanks = computed(() => {
    const result = { ...nodeRanks.value };
    for (const [nodeId, rank] of Object.entries(pendingRanks.value)) {
      result[nodeId] = (Number(result[nodeId]) || 0) + rank;
    }
    return result;
  });
  const effectiveBranchPoints = computed(() => {
    const result = { ...branchPoints.value };
    for (const [nodeId, rank] of Object.entries(pendingRanks.value)) {
      const node = nodes.value.find(item => item.nodeId === nodeId);
      if (node) result[node.branch] = (Number(result[node.branch]) || 0) + rank;
    }
    return result;
  });
  const remainingPoints = computed(() =>
    Math.max(0, talentPointsAvailable.value - pendingSequence.value.length)
  );
  const unlockedSet = computed(() => new Set(Object.keys(effectiveRanks.value)));
  const selectedNode = computed(() => {
    const node = nodes.value.find(item => item.nodeId === selectedNodeId.value) || null;
    return node
      ? {
          ...node,
          currentRank: rankOf(node.nodeId),
          savedRank: Number(nodeRanks.value[node.nodeId]) || 0,
          pendingRank: Number(pendingRanks.value[node.nodeId]) || 0,
        }
      : null;
  });
  const filteredNodes = computed(() =>
    branchFilter.value ? nodes.value.filter(node => node.branch === branchFilter.value) : []
  );

  function rankOf(nodeId) {
    return Number(effectiveRanks.value[nodeId]) || 0;
  }

  function isUnlocked(nodeId) {
    return rankOf(nodeId) > 0;
  }

  function isUnlockable(node) {
    if (!node || rankOf(node.nodeId) >= node.maxRank) return false;
    if (remainingPoints.value < 1) return false;
    if ((Number(effectiveBranchPoints.value[node.branch]) || 0) < node.requiredBranchPoints)
      return false;
    return (node.requires || []).every(required => isUnlocked(required));
  }

  function addPending(nodeId) {
    const node = nodes.value.find(item => item.nodeId === nodeId);
    if (!node || !isUnlockable(node)) return false;
    pendingSequence.value.push(nodeId);
    selectedNodeId.value = nodeId;
    return true;
  }

  function removePending(nodeId) {
    const index = pendingSequence.value.lastIndexOf(nodeId);
    if (index < 0) return false;
    const candidate = [...pendingSequence.value];
    candidate.splice(index, 1);

    const ranks = { ...nodeRanks.value };
    const points = { ...branchPoints.value };
    for (const pendingId of candidate) {
      const node = nodes.value.find(item => item.nodeId === pendingId);
      if (!node) return false;
      if ((Number(ranks[pendingId]) || 0) >= node.maxRank) return false;
      if ((Number(points[node.branch]) || 0) < node.requiredBranchPoints) return false;
      if (!(node.requires || []).every(required => Number(ranks[required]) > 0)) return false;
      ranks[pendingId] = (Number(ranks[pendingId]) || 0) + 1;
      points[node.branch] = (Number(points[node.branch]) || 0) + 1;
    }
    pendingSequence.value = candidate;
    return true;
  }

  function canRemovePending(nodeId) {
    return Number(pendingRanks.value[nodeId]) > 0;
  }

  async function fetchTree() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/talents/tree`, { credentials: 'include' });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      nodes.value = body.nodes || [];
      return nodes.value;
    } catch (errorValue) {
      error.value = errorValue.message;
      return [];
    } finally {
      loading.value = false;
    }
  }

  async function fetchMe() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/talents/me`, { credentials: 'include' });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      applyTalentPayload(body.talents, body.bonuses);
      return body;
    } catch (errorValue) {
      error.value = errorValue.message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  function applyTalentPayload(talents, nextBonuses) {
    if (!talents) return;
    unlockedNodeIds.value = talents.unlockedNodeIds || [];
    nodeRanks.value = talents.nodeRanks || {};
    branchPoints.value = talents.branchPoints || {};
    spentPoints.value = talents.spentPoints ?? 0;
    talentPointsAvailable.value = talents.talentPointsAvailable ?? 0;
    level.value = talents.level ?? 1;
    effects.value = talents.effects || [];
    respec.value = talents.respec || null;
    if (nextBonuses) bonuses.value = nextBonuses;
  }

  async function loadAll() {
    await Promise.all([fetchTree(), fetchMe()]);
  }

  async function commitPending() {
    if (pendingSequence.value.length === 0) return null;
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/talents/commit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeIds: pendingSequence.value }),
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      applyTalentPayload(body.talents, body.bonuses);
      pendingSequence.value = [];
      await usePlayerStore().fetchPlayer();
      return body;
    } catch (errorValue) {
      error.value = errorValue.message;
      return null;
    } finally {
      actionLoading.value = false;
    }
  }

  async function respecTree() {
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await fetch(`${API_BASE}/api/talents/respec`, {
        method: 'POST',
        credentials: 'include',
      });
      const { ok, body } = await parseApiResponse(res);
      if (!ok) throw new Error(await readApiError(res, body));
      applyTalentPayload(body.talents, body.bonuses);
      pendingSequence.value = [];
      await usePlayerStore().fetchPlayer();
      return body;
    } catch (errorValue) {
      error.value = errorValue.message;
      return null;
    } finally {
      actionLoading.value = false;
    }
  }

  function selectNode(nodeId) {
    selectedNodeId.value = nodeId;
  }

  function setBranchFilter(branch) {
    branchFilter.value = branch || '';
    selectedNodeId.value = null;
  }

  function reset() {
    nodes.value = [];
    unlockedNodeIds.value = [];
    nodeRanks.value = {};
    branchPoints.value = {};
    spentPoints.value = 0;
    talentPointsAvailable.value = 0;
    effects.value = [];
    bonuses.value = null;
    respec.value = null;
    error.value = null;
    selectedNodeId.value = null;
    branchFilter.value = '';
    pendingSequence.value = [];
  }

  return {
    nodes,
    unlockedNodeIds,
    nodeRanks,
    branchPoints,
    spentPoints,
    talentPointsAvailable,
    level,
    effects,
    bonuses,
    respec,
    loading,
    actionLoading,
    error,
    selectedNodeId,
    branchFilter,
    pendingSequence,
    pendingRanks,
    effectiveRanks,
    effectiveBranchPoints,
    remainingPoints,
    unlockedSet,
    selectedNode,
    filteredNodes,
    isUnlocked,
    rankOf,
    isUnlockable,
    addPending,
    removePending,
    canRemovePending,
    fetchTree,
    fetchMe,
    loadAll,
    commitPending,
    respecTree,
    selectNode,
    setBranchFilter,
    reset,
  };
});
