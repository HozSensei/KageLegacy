-- Notifications Bureau : pénalité stagnation Genin/Chunin à H72

ALTER TABLE dojo_notifications
  MODIFY kind ENUM('bird_flight', 'market_sale', 'mission_report', 'stagnation') NOT NULL;
