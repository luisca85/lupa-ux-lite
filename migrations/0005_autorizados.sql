-- Beta privada (spec cta): emails que Luis autorizó a crear cuenta. Con
-- SOLO_AUTORIZADOS="1", un email nuevo que no está acá va a la lista de espera.
-- Se agregan y quitan con scripts/autorizar.mjs.
CREATE TABLE IF NOT EXISTS autorizados (
  email  TEXT PRIMARY KEY,
  creado INTEGER NOT NULL
);
