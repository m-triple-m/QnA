-- =============================================================================
-- QuizLive — MySQL Database Schema
-- Production Ready DDL with UTF8MB4, Foreign Keys, Indexes & Cascades
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `quizlive`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `quizlive`;

-- Disable foreign key checks during schema creation
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- Table: users
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'host') NOT NULL DEFAULT 'host',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: quizzes
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `quizzes`;
CREATE TABLE `quizzes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `host_id` INT UNSIGNED NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_quizzes_host_id` (`host_id`),
  KEY `idx_quizzes_is_active` (`is_active`),
  CONSTRAINT `fk_quizzes_host`
    FOREIGN KEY (`host_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: questions
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `questions`;
CREATE TABLE `questions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quiz_id` INT UNSIGNED NOT NULL,
  `text` TEXT NOT NULL,
  `type` ENUM('mcq', 'true_false', 'short_answer', 'poll') NOT NULL DEFAULT 'mcq',
  `media_url` VARCHAR(500) DEFAULT NULL,
  `time_limit_sec` INT NOT NULL DEFAULT 30,
  `points` INT NOT NULL DEFAULT 10,
  `order_index` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_questions_quiz_id` (`quiz_id`),
  KEY `idx_questions_order` (`quiz_id`, `order_index`),
  CONSTRAINT `fk_questions_quiz`
    FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: options
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `options`;
CREATE TABLE `options` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question_id` INT UNSIGNED NOT NULL,
  `text` VARCHAR(500) NULL DEFAULT '',
  `media_url` VARCHAR(500) NULL DEFAULT NULL,
  `is_correct` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_options_question_id` (`question_id`),
  CONSTRAINT `fk_options_question`
    FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: sessions
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quiz_id` INT UNSIGNED NOT NULL,
  `code` VARCHAR(6) NOT NULL,
  `qr_data` MEDIUMTEXT DEFAULT NULL,
  `status` ENUM('waiting', 'live', 'ended') NOT NULL DEFAULT 'waiting',
  `current_question_index` INT NOT NULL DEFAULT 0,
  `started_at` DATETIME DEFAULT NULL,
  `ended_at` DATETIME DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sessions_code` (`code`),
  KEY `idx_sessions_quiz_id` (`quiz_id`),
  KEY `idx_sessions_status` (`status`),
  CONSTRAINT `fk_sessions_quiz`
    FOREIGN KEY (`quiz_id`) REFERENCES `quizzes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: participants
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `participants`;
CREATE TABLE `participants` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `session_id` INT UNSIGNED NOT NULL,
  `nickname` VARCHAR(30) NOT NULL,
  `socket_id` VARCHAR(100) DEFAULT NULL,
  `score` INT NOT NULL DEFAULT 0,
  `joined_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_participants_session_id` (`session_id`),
  KEY `idx_participants_score` (`session_id`, `score` DESC),
  KEY `idx_participants_socket_id` (`socket_id`),
  CONSTRAINT `fk_participants_session`
    FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: answers
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `answers`;
CREATE TABLE `answers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `participant_id` INT UNSIGNED NOT NULL,
  `question_id` INT UNSIGNED NOT NULL,
  `option_id` INT UNSIGNED DEFAULT NULL,
  `text_answer` VARCHAR(1000) DEFAULT NULL,
  `time_taken_ms` INT DEFAULT NULL,
  `is_correct` TINYINT(1) NOT NULL DEFAULT 0,
  `points_awarded` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_participant_question` (`participant_id`, `question_id`),
  KEY `idx_answers_participant_id` (`participant_id`),
  KEY `idx_answers_question_id` (`question_id`),
  KEY `idx_answers_option_id` (`option_id`),
  CONSTRAINT `fk_answers_participant`
    FOREIGN KEY (`participant_id`) REFERENCES `participants` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_answers_question`
    FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_answers_option`
    FOREIGN KEY (`option_id`) REFERENCES `options` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- Sample Seed Data (Optional)
-- =============================================================================

-- Default Admin User (Password: Admin123!)
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `is_active`, `createdAt`, `updatedAt`)
VALUES (
  1,
  'Super Admin',
  'admin@quizlive.com',
  '$2a$12$0Gg2pGq.z7y/1y88L9PzO.rQzT3LKnf09Yv9VlS10.l6CqRkK5YyW',
  'admin',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE `email`=`email`;

-- Demo Host User (Password: Host123!)
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `is_active`, `createdAt`, `updatedAt`)
VALUES (
  2,
  'Demo Host',
  'host@quizlive.com',
  '$2a$12$0Gg2pGq.z7y/1y88L9PzO.rQzT3LKnf09Yv9VlS10.l6CqRkK5YyW',
  'host',
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE `email`=`email`;

-- Sample Quiz
INSERT INTO `quizzes` (`id`, `title`, `description`, `host_id`, `is_active`, `createdAt`, `updatedAt`)
VALUES (
  1,
  'General Knowledge & Tech Trivia',
  'A fun interactive demo quiz featuring MCQs, True/False and Poll questions.',
  2,
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE `title`=`title`;

-- Question 1 (MCQ)
INSERT INTO `questions` (`id`, `quiz_id`, `text`, `type`, `time_limit_sec`, `points`, `order_index`, `createdAt`, `updatedAt`)
VALUES (
  1,
  1,
  'What does the "M" stand for in the MERN stack?',
  'mcq',
  20,
  100,
  0,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE `text`=`text`;

INSERT INTO `options` (`id`, `question_id`, `text`, `is_correct`, `createdAt`, `updatedAt`)
VALUES
  (1, 1, 'MongoDB', 1, NOW(), NOW()),
  (2, 1, 'MySQL', 0, NOW(), NOW()),
  (3, 1, 'MariaDB', 0, NOW(), NOW()),
  (4, 1, 'Microsoft', 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE `text`=`text`;

-- Question 2 (True/False)
INSERT INTO `questions` (`id`, `quiz_id`, `text`, `type`, `time_limit_sec`, `points`, `order_index`, `createdAt`, `updatedAt`)
VALUES (
  2,
  1,
  'HTTP/2 and WebSockets allow full-duplex communication between client and server.',
  'true_false',
  15,
  50,
  1,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE `text`=`text`;

INSERT INTO `options` (`id`, `question_id`, `text`, `is_correct`, `createdAt`, `updatedAt`)
VALUES
  (5, 2, 'True', 1, NOW(), NOW()),
  (6, 2, 'False', 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE `text`=`text`;

-- Question 3 (Poll)
INSERT INTO `questions` (`id`, `quiz_id`, `text`, `type`, `time_limit_sec`, `points`, `order_index`, `createdAt`, `updatedAt`)
VALUES (
  3,
  1,
  'Which frontend styling approach do you prefer?',
  'poll',
  25,
  10,
  2,
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE `text`=`text`;

INSERT INTO `options` (`id`, `question_id`, `text`, `is_correct`, `createdAt`, `updatedAt`)
VALUES
  (7, 3, 'Tailwind CSS', 1, NOW(), NOW()),
  (8, 3, 'CSS Modules', 1, NOW(), NOW()),
  (9, 3, 'Styled Components', 1, NOW(), NOW()),
  (10, 3, 'Vanilla CSS', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `text`=`text`;
