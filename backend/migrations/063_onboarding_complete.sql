-- Onboarding enrichi: etapes training / recon / ligue, sans soft-hide

ALTER TABLE sensei
  ADD COLUMN onboarding_training_done TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN onboarding_recon_done TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN onboarding_league_done TINYINT(1) NOT NULL DEFAULT 0;
