-- Seed / verify: pending employee status
-- Run: SELECT id, name FROM employee_statuses WHERE name = 'pending';
-- If it returns a row, note the id and update employee_model.py default.

-- If not yet inserted:
INSERT INTO employee_statuses (name, description)
VALUES ('pending', 'Pre-activation state — employee has no job or department yet')
ON CONFLICT (name) DO NOTHING;

-- After confirming the pending id, update employee_model.py:
--   status_id: Mapped[int] = mapped_column(
--       ForeignKey("employee_statuses.id"), nullable=False, default=<PENDING_ID>
--   )
-- No Alembic migration needed (Python-side default only, not server-side).
