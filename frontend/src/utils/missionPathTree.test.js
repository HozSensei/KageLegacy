import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectSubtreeIds,
  countSubtreeSteps,
  findPathStartId,
  indexNodes,
  resolvePreviewChoiceId,
  visibleBranchChoices,
  walkSegment,
} from './missionPathTree.js';

function sampleTree() {
  return [
    { id: 'a', type: 'combat', status: 'cleared', nextNodeId: 'b' },
    { id: 'b', type: 'shop', status: 'cleared', nextNodeId: 'fork' },
    {
      id: 'fork',
      type: 'branch',
      status: 'available',
      choices: [
        { id: 'left', nextNodeId: 'l1', labelFr: 'Gauche' },
        { id: 'mid', nextNodeId: 'm1', labelFr: 'Milieu' },
        { id: 'right', nextNodeId: 'r1', labelFr: 'Droite' },
      ],
    },
    { id: 'l1', type: 'combat', status: 'locked', nextNodeId: 'l2', branch: 'left' },
    { id: 'l2', type: 'combat', status: 'locked', branch: 'left' },
    { id: 'm1', type: 'rest', status: 'locked', nextNodeId: 'm-fork', branch: 'mid' },
    {
      id: 'm-fork',
      type: 'branch',
      status: 'locked',
      branch: 'mid',
      choices: [
        { id: 'm-a', nextNodeId: 'ma', labelFr: 'A' },
        { id: 'm-b', nextNodeId: 'mb', labelFr: 'B' },
      ],
    },
    { id: 'ma', type: 'combat', status: 'locked', branch: 'mid' },
    { id: 'mb', type: 'combat', status: 'locked', branch: 'mid' },
    { id: 'r1', type: 'shop', status: 'locked', nextNodeId: 'r2', branch: 'right' },
    { id: 'r2', type: 'combat', status: 'locked', boss: true, branch: 'right' },
  ];
}

test('findPathStartId returns graph root', () => {
  assert.equal(findPathStartId(sampleTree()), 'a');
});

test('walkSegment stops at branch inclusive', () => {
  const byId = indexNodes(sampleTree());
  const seg = walkSegment(byId, 'a');
  assert.deepEqual(
    seg.map(n => n.id),
    ['a', 'b', 'fork']
  );
});

test('visibleBranchChoices supports 3+ forks', () => {
  const nodes = sampleTree();
  const byId = indexNodes(nodes);
  const fork = byId.fork;
  const choices = visibleBranchChoices(fork, byId);
  assert.equal(choices.length, 3);
  assert.deepEqual(
    choices.map(c => c.id),
    ['left', 'mid', 'right']
  );
});

test('collectSubtreeIds walks nested branch choices', () => {
  const byId = indexNodes(sampleTree());
  const mid = collectSubtreeIds(byId, 'm1');
  assert.ok(mid.has('m1'));
  assert.ok(mid.has('m-fork'));
  assert.ok(mid.has('ma'));
  assert.ok(mid.has('mb'));
  assert.equal(mid.has('l1'), false);
  assert.equal(countSubtreeSteps(byId, 'l1'), 2);
  assert.equal(countSubtreeSteps(byId, 'r1'), 2);
});

test('resolvePreviewChoiceId prefers chosen then preview map', () => {
  const nodes = sampleTree();
  const byId = indexNodes(nodes);
  const fork = { ...byId.fork, chosen: 'right' };
  assert.equal(resolvePreviewChoiceId(fork, byId, {}), 'right');
  assert.equal(resolvePreviewChoiceId(byId.fork, byId, { fork: 'mid' }), 'mid');
  assert.equal(resolvePreviewChoiceId(byId.fork, byId, {}), 'left');
});

test('skipped subtrees drop from visible choices before pick', () => {
  const nodes = sampleTree().map(n =>
    n.branch === 'left' || n.id === 'l1' || n.id === 'l2'
      ? { ...n, status: 'skipped' }
      : n
  );
  // mark left leaves skipped
  const patched = nodes.map(n =>
    n.id === 'l1' || n.id === 'l2' ? { ...n, status: 'skipped' } : n
  );
  const byId = indexNodes(patched);
  const choices = visibleBranchChoices(byId.fork, byId);
  assert.deepEqual(
    choices.map(c => c.id),
    ['mid', 'right']
  );
});

test('visibleBranchChoices keeps all paths after choice (tabs stay)', () => {
  const patched = sampleTree().map(n => {
    if (n.id === 'fork') return { ...n, status: 'cleared', chosen: 'right' };
    if (n.branch === 'left' || n.branch === 'mid') return { ...n, status: 'skipped' };
    return n;
  });
  const byId = indexNodes(patched);
  const choices = visibleBranchChoices(byId.fork, byId);
  // Les onglets listent encore tous les chemins ; seul le choisi continue sous la timeline.
  assert.deepEqual(
    choices.map(c => c.id),
    ['left', 'mid', 'right']
  );
  assert.equal(countSubtreeSteps(byId, 'l1'), 0);
  assert.equal(countSubtreeSteps(byId, 'l1', { includeSkipped: true }), 2);
  assert.deepEqual(
    walkSegment(byId, 'l1', { includeSkipped: true }).map(n => n.id),
    ['l1', 'l2']
  );
  assert.equal(countSubtreeSteps(byId, 'r1'), 2);
});
