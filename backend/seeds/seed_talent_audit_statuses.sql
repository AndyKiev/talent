-- Seed the talent-audit directory/status tables.
-- These are reference tables normally managed via the admin UI; this seed
-- provides the minimal default rows the talent-audit feature relies on:
--   * talent_audit_statuses           — audit creation defaults to id=1
--   * talent_audit_interview_statuses — interview dialog defaults to id=1
--   * talent_audit_job_statuses       — job dialog defaults to id=1; the
--     interview→jobs flow resolves ids by key ('created' / 'closed')
-- Idempotent: re-running is a no-op.

INSERT INTO talent_audit_statuses (id, name, description) VALUES
    (1, 'in_progress', 'Audit is in progress'),
    (2, 'completed',   'Audit completed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO talent_audit_interview_statuses (id, name, description) VALUES
    (1, 'created', 'Interview created'),
    (2, 'closed',  'Interview closed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO talent_audit_job_statuses (id, name, key, description) VALUES
    (1, 'created', 'created', 'Job created / open for assessment'),
    (2, 'closed',  'closed',  'Job closed / assessed')
ON CONFLICT (id) DO NOTHING;

-- Keep sequences ahead of the explicit ids so future admin inserts don't collide.
SELECT setval('talent_audit_statuses_id_seq',           (SELECT MAX(id) FROM talent_audit_statuses));
SELECT setval('talent_audit_interview_statuses_id_seq',  (SELECT MAX(id) FROM talent_audit_interview_statuses));
SELECT setval('talent_audit_job_statuses_id_seq',        (SELECT MAX(id) FROM talent_audit_job_statuses));
