import { query } from '../config/database.js';

export async function persistReconNarrativeSegments(missionId, segments) {
  await query('DELETE FROM reconnaissance_narrative_segments WHERE mission_id = ?', [missionId]);

  for (const seg of segments) {
    await query(
      `INSERT INTO reconnaissance_narrative_segments
         (mission_id, segment_order, block_type, unlock_minutes, text, template_key, template_index, template_vars)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        missionId,
        seg.segment_order,
        seg.block_type,
        seg.unlock_minutes ?? 0,
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

export async function getReconNarrativeSegments(missionId) {
  const rows = await query(
    `SELECT segment_order, block_type, unlock_minutes, text, template_key, template_index, template_vars
     FROM reconnaissance_narrative_segments
     WHERE mission_id = ?
     ORDER BY segment_order`,
    [missionId],
  );

  return rows.map((row) => ({
    ...row,
    template_vars: parseTemplateVars(row.template_vars),
  }));
}
