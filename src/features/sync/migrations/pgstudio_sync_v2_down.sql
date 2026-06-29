-- Tear down PgStudio self-hosted sync schema (v2). Destroys all synced data.
DROP TABLE IF EXISTS pgstudio_sync.items_v2;
DROP TABLE IF EXISTS pgstudio_sync.deletes_v2;
DROP SEQUENCE IF EXISTS pgstudio_sync.cursor_seq;
-- Schema kept (may hold workspace tables); drop manually if unused:
--   DROP SCHEMA IF EXISTS pgstudio_sync CASCADE;
