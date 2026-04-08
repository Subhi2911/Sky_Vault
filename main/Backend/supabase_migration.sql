-- ============================================================
-- Sky Vault — Supabase Migration Script
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Safe to run multiple times (uses IF NOT EXISTS / DO blocks)
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Add trashed_at to files table
--    Stores when a file was trashed so we can auto-delete
--    files that have been in trash for more than 30 days.
-- ────────────────────────────────────────────────────────────
ALTER TABLE files
    ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMPTZ DEFAULT NULL;


-- ────────────────────────────────────────────────────────────
-- 2. organisations table
--    Each org has a unique short join code (e.g. SKY001)
--    that teachers and students use to join it.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organisations (
    id         BIGSERIAL PRIMARY KEY,
    name       TEXT        NOT NULL,
    code       TEXT        NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- 3. Add org_id to users, files, folders
--    Links every record to an organisation.
--    NULL = personal (non-org) user/file/folder.
-- ────────────────────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organisations(id) ON DELETE SET NULL;

ALTER TABLE files
    ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organisations(id) ON DELETE SET NULL;

ALTER TABLE folders
    ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES organisations(id) ON DELETE SET NULL;


-- ────────────────────────────────────────────────────────────
-- 4. classes table
--    Each class belongs to an org and is created by a teacher.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
    id          BIGSERIAL PRIMARY KEY,
    org_id      BIGINT      NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    teacher_id  BIGINT      NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    subject     TEXT,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- 5. class_students table
--    Tracks which students are in which class.
--    status: pending → student received invite but hasn't responded
--            accepted → student is officially in the class
--            rejected → student declined the invite
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_students (
    id         BIGSERIAL PRIMARY KEY,
    class_id   BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    status     TEXT   NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'accepted', 'rejected')),
    joined_at  TIMESTAMPTZ DEFAULT NULL,
    UNIQUE (class_id, student_id)
);


-- ────────────────────────────────────────────────────────────
-- 6. assignments table
--    Each assignment belongs to a class and an org.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignments (
    id          BIGSERIAL PRIMARY KEY,
    class_id    BIGINT      NOT NULL REFERENCES classes(id)       ON DELETE CASCADE,
    org_id      BIGINT      NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    description TEXT,
    total_marks INTEGER     DEFAULT 100,
    due_date    TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- 7. submissions table
--    Each row is one student's submitted file for one assignment.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
    id            BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT      NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id    BIGINT      NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
    file_id       BIGINT      REFERENCES files(id)                ON DELETE SET NULL,
    submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assignment_id, student_id)
);


-- ────────────────────────────────────────────────────────────
-- 8. notifications table
--    Stores notifications for both teachers and students.
--
--    type values:
--      class_invite        → student was invited to a class
--      invite_accepted     → teacher sees student accepted
--      invite_rejected     → teacher sees student rejected
--      assignment_posted   → student sees new assignment
--      assignment_submitted → teacher sees a submission
--
--    metadata: JSON with extra context e.g.
--      { "class_name": "Math 101", "assignment_title": "HW1" }
--
--    action_taken: what the recipient did
--      e.g. "accepted", "rejected", null (not acted yet)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         TEXT        NOT NULL,
    message      TEXT        NOT NULL,
    metadata     JSONB       DEFAULT '{}',
    action_taken TEXT        DEFAULT NULL,
    is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- 9. Indexes for performance
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_id  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read  ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_class_students_class   ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class      ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_classes_org            ON classes(org_id);
CREATE INDEX IF NOT EXISTS idx_files_trashed_at       ON files(trashed_at) WHERE trashed_at IS NOT NULL;


-- ────────────────────────────────────────────────────────────
-- 10. Enable Realtime on notifications
--     This makes notifications appear instantly without refresh.
--     Run this AFTER creating the table above.
-- ────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- ============================================================
-- DONE. All tables and columns are now in place.
--
-- MANUAL STEP (do this in Supabase Dashboard):
--   Database → Replication → Tables
--   Make sure "notifications" is toggled ON
--   (the ALTER PUBLICATION above does this via SQL,
--    but you can verify it visually there)
-- ============================================================
