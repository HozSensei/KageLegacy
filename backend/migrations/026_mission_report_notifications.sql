-- Notifications : rapports de mission idle à H72

ALTER TABLE dojo_notifications
  MODIFY kind ENUM('bird_flight', 'market_sale', 'mission_report') NOT NULL;
