import { query } from '../../config/database.js';

export async function persistNarrativeSegments(matchId, segments) {
  await query('DELETE FROM match_narrative_segments WHERE match_id = ?', [matchId]);

  for (const seg of segments) {
    await query(
      `INSERT INTO match_narrative_segments
         (match_id, segment_order, block_type, unlock_minutes, text, template_key, template_index, template_vars)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        matchId,
        seg.segment_order,
        seg.block_type,
        seg.unlock_minutes,
        seg.text,
        seg.template_key ?? null,
        seg.template_index ?? null,
        seg.template_vars ? JSON.stringify(seg.template_vars) : null,
      ],
    );
  }
}

function parseTemplateVars(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function getNarrativeSegments(matchId) {
  const rows = await query(
    `SELECT segment_order, block_type, unlock_minutes, text, template_key, template_index, template_vars
     FROM match_narrative_segments
     WHERE match_id = ?
     ORDER BY segment_order`,
    [matchId],
  );

  return rows.map((row) => ({
    ...row,
    template_vars: parseTemplateVars(row.template_vars),
  }));
}
