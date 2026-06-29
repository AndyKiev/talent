-- Seed the review_session_statuses directory.
-- Stable rows; the backend resolves ids by `key` (no magic numbers).
INSERT INTO review_session_statuses (key, name, description)
VALUES
    ('pending', 'Pending', 'Session is created but not yet started'),
    ('open',   'Open',   'Session is active and accepting reviews'),
    ('closed', 'Closed', 'Session has been closed and reviews are finalized');
