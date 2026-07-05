import { query } from '../../config/database.js';

export async function persistNarrativeSegments(matchId, segments) {
  await query('DELETE FROM match_narrative_segments WHERE match_id = ?', [matchId]);

  for (const seg of segments) {
    await query(
      `INSERT INTO match_narrative_segments (match_id, segment_order, block_type, unlock_minutes, text)
       VALUES (?, ?, ?, ?, ?)`,
      [matchId, seg.segment_order, seg.block_type, seg.unlock_minutes, seg.text]
    );
  }
}

export async function getNarrativeSegments(matchId) {
  return query(
    `SELECT segment_order, block_type, unlock_minutes, text
     FROM match_narrative_segments
     WHERE match_id = ?
     ORDER BY segment_order`,
    [matchId]
  );
}
