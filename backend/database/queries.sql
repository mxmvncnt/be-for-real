
-- name: CreateUser :one
INSERT INTO public.users (email, password, username, description, profile_pic_url)
VALUES (@email::text, @password::text, @username::text, @description::text, @profile_pic_url::text)
RETURNING *;

-- name: GetUserFromId :one
SELECT *
FROM public.users
WHERE id = @id::uuid;

-- name: CreateSession :exec
INSERT INTO sessions (token, user_id, expires_at, created_at)
VALUES (@token::text, @user_id::uuid, @expires_at::timestamptz, now());

-- name: GetUserFromToken :one
SELECT sqlc.embed(users), sqlc.embed(sessions)
FROM sessions JOIN users ON sessions.user_id = users.id
WHERE sessions.token = @token::text
LIMIT 1;

-- name: ExtendSession :exec
UPDATE sessions
SET expires_at = @expires_at::timestamptz
WHERE token = @token::text;

-- name: TerminateSession :exec
DELETE FROM sessions
WHERE token = @token::text;