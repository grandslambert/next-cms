-- Add before/after change tracking to activity_log table
ALTER TABLE activity_log
ADD COLUMN changes_before JSON NULL AFTER details,
ADD COLUMN changes_after JSON NULL AFTER changes_before;

