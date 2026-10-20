-- Lista de espera de la beta (spec cta, fase 3): emails que pidieron entrar cuando los
-- cupos (MAX_CUENTAS) ya estaban completos. No se les manda ningún email.
CREATE TABLE IF NOT EXISTS espera (
  email  TEXT PRIMARY KEY,
  creado INTEGER NOT NULL
);
