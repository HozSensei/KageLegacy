-- recon_meta_json dupliquait les champs déjà présents dans roster_report_json

ALTER TABLE cycle_scout_intel DROP COLUMN recon_meta_json;
