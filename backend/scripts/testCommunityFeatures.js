/**
 * Tests purs (sans DB) — profil public, cadres, titres saison libre, mur curseur.
 */
import assert from 'node:assert/strict';
import {
  PROFILE_FRAME_CATALOG,
  buildSeasonFreeNicknameEntry,
  isKnownNicknameId,
  isKnownProfileFrameId,
  seasonFreeNicknameId,
  serializeCharacterAppearance,
  achievementFamilyNicknameForCategory,
} from '../src/services/characterAppearance.js';
import { buildSeasonRewards } from '../src/services/battlePassSeasonTemplate.js';
import { publicFighterIdentity } from '../src/services/deckCombat/fighterIdentity.js';

assert.equal(seasonFreeNicknameId(3), 'season_3_free');
assert.ok(isKnownNicknameId('season_3_free'));
assert.ok(isKnownNicknameId('ach_combat'));
assert.equal(achievementFamilyNicknameForCategory('missions')?.id, 'ach_missions');

const freeEntry = buildSeasonFreeNicknameEntry(2);
assert.equal(freeEntry.id, 'season_2_free');
assert.ok(freeEntry.name.fr);

const rewards = buildSeasonRewards({ seasonNumber: 1 });
assert.ok(rewards.free['4'].some(r => r.type === 'nickname' && r.nicknameId === 'season_1_free'));
assert.ok(rewards.free['10'].some(r => r.type === 'frame' && r.frameId === 'frame_ember'));
assert.ok(rewards.premium['15'].some(r => r.type === 'frame' && r.frameId === 'frame_volt'));

assert.ok(PROFILE_FRAME_CATALOG.length >= 4);
assert.ok(isKnownProfileFrameId('frame_ember'));
assert.equal(isKnownProfileFrameId('frame_leaf'), false);
assert.equal(isKnownProfileFrameId('nope'), false);

const appearance = serializeCharacterAppearance(
  {
    character_rank: 'Genin',
    character_level: 10,
    character_highest_level: 10,
    character_avatar_id: 'genin-1-1',
    character_nickname_id: 'genin',
    character_frame_id: 'frame_ember',
  },
  ['genin'],
  ['frame_ember'],
);
assert.equal(appearance.frameId, 'frame_ember');
assert.equal(appearance.nicknameId, 'genin');

const lockedFrame = serializeCharacterAppearance(
  {
    character_rank: 'Genin',
    character_level: 10,
    character_highest_level: 10,
    character_avatar_id: 'genin-1-1',
    character_frame_id: 'frame_ember',
  },
  [],
  [],
);
assert.equal(lockedFrame.frameId, null);

const identity = publicFighterIdentity({
  rank: 'Genin',
  level: 12,
  factionId: 'midorihara',
  profile: {
    avatarId: 'genin-1-1',
    nicknameId: 'genin',
    frameId: 'frame_volt',
  },
});
assert.equal(identity.profile.frameId, 'frame_volt');
assert.equal(identity.factionId, 'midorihara');

console.log('✓ testCommunityFeatures OK');
