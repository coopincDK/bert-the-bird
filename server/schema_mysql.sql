-- Managed Bert score database. Only additive, idempotent schema creation.
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(32) NOT NULL PRIMARY KEY,
    applied_at VARCHAR(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS scores (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    run_id VARCHAR(128) NOT NULL UNIQUE,
    player_id VARCHAR(80) NOT NULL,
    player_name VARCHAR(24) NOT NULL,
    mode VARCHAR(16) NOT NULL,
    level_id INT NOT NULL,
    score BIGINT NOT NULL,
    streak INT NOT NULL,
    time_seconds DOUBLE NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    INDEX scores_board_idx (mode, created_at, score, streak, time_seconds),
    INDEX scores_player_idx (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS challenges (
    id VARCHAR(32) NOT NULL PRIMARY KEY,
    creator_id VARCHAR(80) NOT NULL,
    creator_name VARCHAR(24) NOT NULL,
    holder_id VARCHAR(80) NOT NULL,
    holder_name VARCHAR(24) NOT NULL,
    level_id INT NOT NULL,
    mode VARCHAR(16) NOT NULL,
    seed BIGINT NOT NULL,
    target_score BIGINT NOT NULL,
    target_streak INT NOT NULL,
    target_time DOUBLE NOT NULL,
    ghost_json MEDIUMTEXT NOT NULL,
    win_streak INT NOT NULL DEFAULT 0,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS challenge_attempts (
    challenge_id VARCHAR(32) NOT NULL,
    player_id VARCHAR(80) NOT NULL,
    attempt INT NOT NULL,
    score BIGINT NOT NULL,
    streak INT NOT NULL,
    time_seconds DOUBLE NOT NULL,
    created_at VARCHAR(40) NOT NULL,
    PRIMARY KEY (challenge_id, player_id, attempt),
    INDEX challenge_attempts_player_idx (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
