/**
 * Helpers pour afficher un parcours mission branché générique
 * (N choix par carrefour, sous-arbres imbriqués via nextNodeId / choices).
 */

export function indexNodes(nodes) {
  return Object.fromEntries((Array.isArray(nodes) ? nodes : []).map(n => [n.id, n]));
}

/** Tous les ids atteignables depuis startId (nextNodeId + choices de carrefours). */
export function collectSubtreeIds(nodesById, startId, { includeSkipped = false } = {}) {
  const ids = new Set();
  if (!startId) return ids;
  const stack = [startId];
  while (stack.length) {
    const id = stack.pop();
    if (!id || ids.has(id)) continue;
    const node = nodesById[id];
    if (!node) continue;
    if (!includeSkipped && node.status === 'skipped') continue;
    ids.add(id);
    if (node.type === 'branch') {
      for (const choice of node.choices || []) {
        if (choice?.nextNodeId) stack.push(choice.nextNodeId);
      }
    } else if (node.nextNodeId) {
      stack.push(node.nextNodeId);
    }
  }
  return ids;
}

/**
 * Segment linéaire depuis startId jusqu’à un carrefour (inclus) ou la fin.
 */
export function walkSegment(nodesById, startId) {
  const segment = [];
  let id = startId;
  const seen = new Set();
  while (id && nodesById[id] && !seen.has(id)) {
    seen.add(id);
    const node = nodesById[id];
    if (node.status === 'skipped') break;
    segment.push(node);
    if (node.type === 'branch') break;
    id = node.nextNodeId || null;
  }
  return segment;
}

/** Racine du parcours : premier nœud non pointé par un autre (hors skipped). */
export function findPathStartId(nodes) {
  const list = (Array.isArray(nodes) ? nodes : []).filter(n => n && n.status !== 'skipped');
  if (!list.length) return null;
  const pointed = new Set();
  for (const n of list) {
    if (n.nextNodeId) pointed.add(n.nextNodeId);
    if (n.type === 'branch') {
      for (const c of n.choices || []) {
        if (c?.nextNodeId) pointed.add(c.nextNodeId);
      }
    }
  }
  const root = list.find(n => !pointed.has(n.id));
  return (root || list[0]).id;
}

export function choiceById(branchNode, choiceId) {
  return (branchNode?.choices || []).find(c => c.id === choiceId) || null;
}

/**
 * Choix actif pour l’aperçu d’un carrefour :
 * choisi en run > preview map > premier choix encore vivant.
 */
export function resolvePreviewChoiceId(branchNode, nodesById, previewMap = {}) {
  if (!branchNode || branchNode.type !== 'branch') return null;
  if (branchNode.chosen) {
    const still = choiceById(branchNode, branchNode.chosen);
    if (still) return still.id;
  }
  const fromMap = previewMap?.[branchNode.id];
  if (fromMap && choiceById(branchNode, fromMap)) return fromMap;

  for (const choice of branchNode.choices || []) {
    const size = collectSubtreeIds(nodesById, choice.nextNodeId).size;
    if (size > 0) return choice.id;
  }
  return branchNode.choices?.[0]?.id || null;
}

/** Choix encore prévisualisables (sous-arbre non entièrement skipped). */
export function visibleBranchChoices(branchNode, nodesById) {
  if (!branchNode || branchNode.type !== 'branch') return [];
  const choices = branchNode.choices || [];
  if (branchNode.chosen) {
    const chosen = choiceById(branchNode, branchNode.chosen);
    return chosen ? [chosen] : choices;
  }
  const alive = choices.filter(c => collectSubtreeIds(nodesById, c.nextNodeId).size > 0);
  return alive.length ? alive : choices;
}

export function countSubtreeSteps(nodesById, startId) {
  return collectSubtreeIds(nodesById, startId).size;
}
