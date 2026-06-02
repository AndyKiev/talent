-- Seed the plan_session_statuses directory.
-- Stable rows; the backend resolves ids by `key` (no magic numbers).
-- created_at/updated_at assumed to have DB defaults (TimestampMixin). If not,
-- add: , now(), now()  to each row and the column list.

