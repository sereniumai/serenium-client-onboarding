-- Welcome video moves from uploaded file → hosted URL (Vimeo/Loom/YouTube).
-- Adds a nullable video_url column. Existing file-based rows stay readable
-- until an admin pastes a URL; uploading is simply no longer supported by
-- the admin UI.

alter table welcome_video add column if not exists video_url text;
