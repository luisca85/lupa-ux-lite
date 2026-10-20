-- Cuentas (spec cta, fase 1). Cada cuenta guarda sus documentos en docs bajo u/{id}/…
-- id     = identificador opaco de la cuenta (no cambia aunque cambie el login)
-- email  = email con el que entra (único, en minúsculas)
CREATE TABLE IF NOT EXISTS usuarios (
  id     TEXT PRIMARY KEY,
  email  TEXT NOT NULL UNIQUE,
  creado INTEGER NOT NULL
);
