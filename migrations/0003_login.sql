-- Login con código por email (spec cta, fase 2). Nada se guarda en claro: solo hashes.
-- codigos: cada pedido de "Continuar con email". Vale 10 minutos y una sola vez, sirve
-- con el código de 6 dígitos o con el botón del email (token). Se conservan una hora
-- para limitar los pedidos (60 s entre pedidos, 5 por hora).
CREATE TABLE IF NOT EXISTS codigos (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  codigo_hash TEXT NOT NULL,
  token_hash  TEXT NOT NULL UNIQUE,
  expira      INTEGER NOT NULL,
  intentos    INTEGER NOT NULL DEFAULT 0,
  usado       INTEGER NOT NULL DEFAULT 0,
  creado      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_codigos_email ON codigos(email, creado);

-- sesiones: la cookie lupa_sesion lleva el token; acá va su hash.
CREATE TABLE IF NOT EXISTS sesiones (
  token_hash TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  expira     INTEGER NOT NULL,
  creado     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones(usuario_id);
