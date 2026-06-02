CREATE TABLE users (
                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                       username VARCHAR(255) NOT NULL UNIQUE,
                       email VARCHAR(254) NOT NULL UNIQUE,
                       password VARCHAR(1024) NOT NULL,
                       description VARCHAR(1024),
                       profile_pic_url VARCHAR(1024)
);

CREATE TABLE sessions (
                          token VARCHAR(128) PRIMARY KEY,
                          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                          created_at TIMESTAMP NOT NULL,
                          expires_at TIMESTAMP NOT NULL
);

CREATE TABLE friends (
                         user_id1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                         user_id2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                         confirmed INTEGER NOT NULL DEFAULT 0,
                         PRIMARY KEY (user_id1, user_id2)
);

CREATE TABLE videos (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        created_at TIMESTAMP NOT NULL,
                        video_url VARCHAR(1024) NOT NULL UNIQUE,
                        filename VARCHAR(1024) NOT NULL UNIQUE,
                        type TEXT CHECK (type IN ('clip', 'mashup', 'multi_rewind'))
);

CREATE TABLE comments (
                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          user_id UUID NOT NULL REFERENCES users(id),
                          video_id UUID NOT NULL REFERENCES videos(id),
                          content VARCHAR(8096)
);