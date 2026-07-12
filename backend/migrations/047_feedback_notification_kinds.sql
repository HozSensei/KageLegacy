-- Nouveaux types de notification : feedback cycle (entraînement, espionnage, opération, clôture)

ALTER TABLE sensei_notifications
  MODIFY kind ENUM(
    'bird_flight',
    'market_sale',
    'mission_report',
    'stagnation',
    'clan_well_fusion',
    'chunin_exam_success',
    'chunin_exam_failure',
    'reconnaissance_challenge',
    'reconnaissance_result',
    'training_billing',
    'scout_roster',
    'operation_start',
    'cycle_close'
  ) NOT NULL;
