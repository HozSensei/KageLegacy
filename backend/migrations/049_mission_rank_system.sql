-- Refonte missions : rangs D/C/B/A (remplace routine/infiltration/cyclone)

ALTER TABLE idle_missions
  MODIFY mission_tier ENUM('routine', 'infiltration', 'cyclone', 'D', 'C', 'B', 'A') NOT NULL;

UPDATE idle_missions SET mission_tier = CASE mission_tier
  WHEN 'routine' THEN 'D'
  WHEN 'infiltration' THEN 'C'
  WHEN 'cyclone' THEN 'B'
  ELSE mission_tier
END;

ALTER TABLE idle_missions
  MODIFY mission_tier ENUM('D', 'C', 'B', 'A') NOT NULL;
