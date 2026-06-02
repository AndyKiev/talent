-- SAMPLE seed for the "levels" directories used by talent-audit interviews.
-- These are domain-configuration tables normally maintained via the admin UI
-- (Talent Statuses / Talent Periods / their links). The values below are
-- placeholders so the interview "set levels" flow is testable end-to-end —
-- replace them with real values via the admin screens.
-- Idempotent: re-running is a no-op.

-- HRM talent statuses (key <= 8 chars, unique)
INSERT INTO talent_statuses (id, key, name, description, is_active) VALUES
    (1, 'HP',    'high potential', 'High potential', true),
    (2, 'KEY',   'key person',     'Key person',     true),
    (3, 'SOLID', 'solid',          'Solid performer', true)
ON CONFLICT (id) DO NOTHING;

-- HRM periods (qty_months drives the ascending-order validation)
INSERT INTO talent_periods (id, name, description, is_active, qty_months) VALUES
    (1, '6 months',  'Short horizon',  true, 6),
    (2, '12 months', 'Medium horizon', true, 12),
    (3, '24 months', 'Long horizon',   true, 24)
ON CONFLICT (id) DO NOTHING;

-- Active (status, period) links — the selectable "levels"
INSERT INTO talent_status_period_link (talent_status_id, talent_period_id, is_active, created_by) VALUES
    (1, 1, true, 3),
    (1, 2, true, 3),
    (1, 3, true, 3),
    (2, 1, true, 3),
    (2, 2, true, 3),
    (3, 1, true, 3)
ON CONFLICT (talent_period_id, talent_status_id) DO NOTHING;

SELECT setval('talent_statuses_id_seq', (SELECT MAX(id) FROM talent_statuses));
SELECT setval('talent_periods_id_seq',  (SELECT MAX(id) FROM talent_periods));
SELECT setval('talent_status_period_link_id_seq', (SELECT MAX(id) FROM talent_status_period_link));
