-- Environnement de match (météo ou topologie, tirage unique)

ALTER TABLE matches
  ADD COLUMN environment_slug VARCHAR(32) NULL AFTER away_user_id,
  ADD COLUMN environment_type ENUM('weather', 'topology') NULL AFTER environment_slug;

ALTER TABLE sensei
  ADD COLUMN scout_env_confirmed_cycle TIMESTAMP NULL AFTER salary_debt;
