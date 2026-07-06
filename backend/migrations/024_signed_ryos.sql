-- Permettre le découvert Ryos (spec −5 000) : colonne signée
ALTER TABLE sensei MODIFY ryos INT NOT NULL DEFAULT 10000;
