/**
 * Smoke test vue échange de pli (sans BDD).
 * Usage : node scripts/testPliExchangeView.js
 */
import assert from 'node:assert/strict';
import { buildPliExchangeView, mapChronicleSegmentForClient } from '../src/services/narrative/pliExchangeView.js';

const segment = {
  segment_order: 3,
  block_type: 'action',
  template_key: 'chronicle.pli',
  template_index: 2,
  template_vars: {
    pli_num: 2,
    home_sensei: 'Akira',
    away_sensei: 'Boro',
    impact_log: {
      degats_pv: 14,
      degats_pv_away: 0,
      cible_name: 'Rei',
      soins_pv: 0,
      soins_pv_away: 0,
    },
    parts: [
      { action_key: 'chronicle.pli.header', vars: { pli_num: 2 } },
      {
        action_key: 'chronicle.pli.play_tai',
        vars: { sensei: 'Akira', actor: 'Kuro', card_name: 'Lame', domain: 'Taijutsu' },
      },
      {
        action_key: 'chronicle.pli.play_gen',
        vars: { sensei: 'Boro', actor: 'Rei', card_name: 'Mirage', domain: 'Genjutsu' },
      },
      {
        action_key: 'chronicle.pli.outcome_win',
        vars: { sensei: 'Akira', winner_team: "l'équipe de Akira" },
      },
    ],
  },
  text: 'legacy',
};

const exchange = buildPliExchangeView(segment);
assert.equal(exchange.pli, 2);
assert.equal(exchange.winner, 'left');
assert.equal(exchange.left.actor, 'Kuro');
assert.equal(exchange.right.actor, 'Rei');
assert.equal(exchange.right.damageReceivedPv, 14);
assert.equal(exchange.right.hitTarget, 'Rei');
assert.equal(exchange.left.damageReceivedPv, 0);

const mapped = mapChronicleSegmentForClient(segment, () => 'texte');
assert.equal(mapped.kind, 'pli');
assert.ok(mapped.exchange);

console.log('testPliExchangeView: OK');
