import { query } from '../config/database.js';
import { grantItemToUser, countUnconsumedItemsBySlug } from './itemGrantService.js';
import { SEAL_ITEM_SLUG, MAX_SEAL_STACK } from './dailySealService.js';
import { getClanMembership, listClanMemberUserIds } from './playerClanService.js';
import { createSenseiNotification } from './senseiNotifications.js';

export async function addChakraDropForSealOpen(userId) {
  const membership = await getClanMembership(userId);
  if (!membership) return { contributed: false };

  const update = await query(
    `UPDATE player_clans
     SET well_drops = LEAST(well_capacity, well_drops + 1)
     WHERE id = ?`,
    [membership.clanId],
  );
  if (!update.affectedRows) return { contributed: false };

  const clanRows = await query(
    'SELECT well_drops, well_capacity, name FROM player_clans WHERE id = ? LIMIT 1',
    [membership.clanId],
  );
  const clan = clanRows[0];
  if (!clan) return { contributed: true, fused: false };

  const fused = clan.well_drops >= clan.well_capacity;
  if (!fused) {
    return {
      contributed: true,
      fused: false,
      well: { drops: clan.well_drops, capacity: clan.well_capacity },
    };
  }

  await query('UPDATE player_clans SET well_drops = 0 WHERE id = ?', [membership.clanId]);
  const memberIds = await listClanMemberUserIds(membership.clanId);

  let bonusGranted = 0;
  for (const memberId of memberIds) {
    const pending = await countUnconsumedItemsBySlug(memberId, SEAL_ITEM_SLUG);
    if (pending >= MAX_SEAL_STACK) continue;
    await grantItemToUser(memberId, SEAL_ITEM_SLUG, 1);
    bonusGranted += 1;
    await createSenseiNotification(memberId, 'clan_well_fusion', {
      clanName: clan.name,
      capacity: clan.well_capacity,
    });
  }

  return {
    contributed: true,
    fused: true,
    bonusGranted,
    well: { drops: 0, capacity: clan.well_capacity },
  };
}
