/**
 * Tests signalements de bug + récompense (sans DB → skip ; avec DB → CRUD + idempotence).
 * Usage: node scripts/testBugReports.js
 */
import assert from 'node:assert/strict';
import { query } from '../src/config/database.js';
import {
  BUG_REPORT_REWARD_RYOS,
  createBugReport,
  listBugReports,
  rewardBugReportAuthor,
  updateBugReport,
} from '../src/services/bugReportService.js';
import { listUserNotifications } from '../src/services/userNotificationService.js';

async function dbAvailable() {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

assert.equal(BUG_REPORT_REWARD_RYOS, 100, 'reward amount');
console.log('testBugReports constants: OK');

if (!(await dbAvailable())) {
  console.log('testBugReports: SKIP (no DB)');
  process.exit(0);
}

const PREFIX = `bug_${Date.now()}`;
const adminInsert = await query(
  `INSERT INTO users (username, is_admin, is_guest) VALUES (?, TRUE, FALSE)`,
  [`${PREFIX}_admin`],
);
const authorInsert = await query(
  `INSERT INTO users (username, is_admin, is_guest) VALUES (?, FALSE, FALSE)`,
  [`${PREFIX}_author`],
);
const adminId = adminInsert.insertId;
const authorId = authorInsert.insertId;

await query(
  `INSERT INTO player_profiles (user_id, display_name, ryos, language)
   VALUES (?, ?, 500, 'fr'), (?, ?, 200, 'fr')`,
  [adminId, `${PREFIX}_admin`, authorId, `${PREFIX}_author`],
);

const report = await createBugReport(authorId, {
  location: 'combat',
  description: 'Le bouton fin de tour ne répond plus après une défausse.',
});
assert.ok(report.id, 'created report id');
assert.equal(report.status, 'open');
assert.equal(report.location, 'combat');

const adminNotes = await listUserNotifications(adminId);
assert.ok(
  adminNotes.some(n => n.kind === 'bug_report_new' && n.payload?.reportId === report.id),
  'admin notified',
);

const patched = await updateBugReport(report.id, {
  status: 'in_progress',
  adminComment: 'Reproduit en local',
});
assert.equal(patched.status, 'in_progress');
assert.equal(patched.adminComment, 'Reproduit en local');

const reward = await rewardBugReportAuthor(report.id, adminId);
assert.equal(reward.ryosGranted, 100);
assert.equal(reward.balances.ryos, 300);

let rejected = false;
try {
  await rewardBugReportAuthor(report.id, adminId);
} catch (error) {
  rejected = error.statusCode === 409;
}
assert.ok(rejected, 'second reward rejected');

const authorNotes = await listUserNotifications(authorId);
assert.ok(
  authorNotes.some(n => n.kind === 'bug_report_reward' && n.payload?.ryos === 100),
  'author notified',
);

const listed = await listBugReports({ status: 'in_progress' });
assert.ok(listed.some(r => r.id === report.id), 'listed by status');

const other = await createBugReport(authorId, {
  location: 'other',
  locationOther: 'Modal de conversion invité',
  description: 'Le formulaire Google reste grisé sur mobile Safari.',
});
assert.equal(other.locationOther, 'Modal de conversion invité');

console.log('testBugReports: OK');
process.exit(0);
