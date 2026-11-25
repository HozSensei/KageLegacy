import { query } from '../config/database.js';
import { rankForLevel, serializeCharacterAppearance } from './characterAppearance.js';
import { listGrantedCardEffectIds } from './cardEffectUnlockService.js';
import { listGrantedFrameIds } from './frameUnlockService.js';
import { listGrantedNicknameIds } from './nicknameUnlockService.js';

export async function loadCombatCharacter(userId) {
  const sql = `SELECT character_name, character_rank, character_level, character_highest_level,
                      character_avatar_id, character_background_id, character_background_color,
                      character_nickname_id, character_frame_id, character_card_effect_id,
                      character_element_affinity, character_faction_id
               FROM player_profiles
               WHERE user_id = ? AND character_name IS NOT NULL
               LIMIT 1`;
  const [row] = await query(sql, [userId]);
  if (!row) return null;

  const level = Number(row.character_level) || 1;
  const [grantedNicknameIds, grantedFrameIds, grantedCardEffectIds] = await Promise.all([
    listGrantedNicknameIds(userId),
    listGrantedFrameIds(userId),
    listGrantedCardEffectIds(userId),
  ]);
  return {
    name: row.character_name,
    rank: row.character_rank ?? rankForLevel(level),
    level,
    profile: serializeCharacterAppearance(
      row,
      grantedNicknameIds,
      grantedFrameIds,
      grantedCardEffectIds,
    ),
    elementAffinity: row.character_element_affinity,
    factionId: row.character_faction_id ?? null,
  };
}
