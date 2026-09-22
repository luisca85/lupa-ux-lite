-- Almacén de documentos con la misma forma que la API tipo Firestore de la app.
-- path   = ruta completa del documento ("estudios/{id}/hallazgos/{hid}")
-- parent = ruta de la colección que lo contiene ("estudios/{id}/hallazgos")
-- data   = JSON del documento (sin el id, que es el último segmento de path)
CREATE TABLE IF NOT EXISTS docs (
  path       TEXT PRIMARY KEY,
  parent     TEXT NOT NULL,
  data       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_docs_parent ON docs(parent);
