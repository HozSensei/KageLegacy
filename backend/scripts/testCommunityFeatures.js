/**
 * Tests purs (sans DB) — profil public, cadres, effets de fiche, titres saison libre.
 */
import assert from 'node:assert/strict';
import {
  PROFILE_CARD_EFFECT_CATALOG,
  PROFILE_FRAME_CATALOG,
  buildSeasonFreeNicknameEntry,
  ONBOARDING_NICKNAME,
  isKnownNicknameId,
  isKnownProfileCardEffectId,
  isKnownProfileFrameId,
  seasonFreeNicknameId,
  serializeCharacterAppearance,
  achievementFamilyNicknameForCategory,
} from '../src/services/characterAppearance.js';
import { catalogEntriesForGrantedIds } from '../src/services/nicknameUnlockService.js';
import { buildSeasonRewards } from '../src/services/battlePassSeasonTemplate.js';
import { publicFighterIdentity } from '../src/services/deckCombat/fighterIdentity.js';

assert.equal(seasonFreeNicknameId(3), 'season_3_free');
assert.ok(isKnownNicknameId('season_3_free'));
assert.ok(isKnownNicknameId('ach_combat'));
assert.ok(isKnownNicknameId(ONBOARDING_NICKNAME.id));
assert.equal(ONBOARDING_NICKNAME.id, 'novice');
assert.equal(ONBOARDING_NICKNAME.name.fr, 'Initié du Village');
assert.equal(achievementFamilyNicknameForCategory('missions')?.id, 'ach_missions');
assert.equal(catalogEntriesForGrantedIds(['novice'])[0]?.id, 'novice');

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

assert.ok(PROFILE_CARD_EFFECT_CATALOG.length >= 7);
assert.ok(isKnownProfileCardEffectId('fx_sheen_gold'));
assert.ok(isKnownProfileCardEffectId('fx_leaves_green'));
assert.ok(isKnownProfileCardEffectId('fx_leaves_orange'));
assert.ok(isKnownProfileCardEffectId('fx_leaves_pink'));
assert.ok(isKnownProfileCardEffectId('fx_rain'));
assert.ok(isKnownProfileCardEffectId('fx_snow'));
assert.ok(isKnownProfileCardEffectId('fx_mist_fade'));
assert.equal(isKnownProfileCardEffectId('fx_leaves'), false);
assert.equal(isKnownProfileCardEffectId('nope'), false);

const appearance = serializeCharacterAppearance(
  {
    character_rank: 'Genin',
    character_level: 10,
    character_highest_level: 10,
    character_avatar_id: 'genin-1-1',
    character_nickname_id: 'genin',
    character_frame_id: 'frame_ember',
    character_card_effect_id: 'fx_leaves_orange',
  },
  ['genin'],
  ['frame_ember'],
  ['fx_leaves_orange'],
);
assert.equal(appearance.frameId, 'frame_ember');
assert.equal(appearance.cardEffectId, 'fx_leaves_orange');
assert.equal(appearance.nicknameId, 'genin');

const lockedFrame = serializeCharacterAppearance(
  {
    character_rank: 'Genin',
    character_level: 10,
    character_highest_level: 10,
    character_avatar_id: 'genin-1-1',
    character_frame_id: 'frame_ember',
    character_card_effect_id: 'fx_snow',
  },
  [],
  [],
  [],
);
assert.equal(lockedFrame.frameId, null);
assert.equal(lockedFrame.cardEffectId, null);

const identity = publicFighterIdentity({
  rank: 'Genin',
  level: 12,
  factionId: 'midorihara',
  profile: {
    avatarId: 'genin-1-1',
    nicknameId: 'genin',
    frameId: 'frame_volt',
    cardEffectId: 'fx_sheen_aurora',
  },
});
assert.equal(identity.profile.frameId, 'frame_volt');
assert.equal(identity.profile.cardEffectId, 'fx_sheen_aurora');
assert.equal(identity.factionId, 'midorihara');

console.log('✓ testCommunityFeatures OK');
