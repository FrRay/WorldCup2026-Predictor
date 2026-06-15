CREATE TABLE IF NOT EXISTS predictions (
    id          VARCHAR(12) PRIMARY KEY,
    gm          JSON NOT NULL,
    ko          JSON NOT NULL,
    slog        JSON NOT NULL,
    play_mode   VARCHAR(16) NOT NULL DEFAULT 'normal',
    encoded     TEXT,
    champion    VARCHAR(64),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
