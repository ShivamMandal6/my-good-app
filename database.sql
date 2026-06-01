-- =============================================
-- CashZilla — Unified Database Schema
-- =============================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- USERS TABLE
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `telegram_id` VARCHAR(50) DEFAULT NULL,
  `name` VARCHAR(100) DEFAULT NULL,
  `first_name` VARCHAR(100) DEFAULT NULL,
  `points` INT DEFAULT 0,
  `balance` DECIMAL(10,2) DEFAULT 0.00,
  `binance_email` VARCHAR(100) DEFAULT NULL,
  `is_banned` TINYINT(1) DEFAULT 0,
  `failed_quizzes` INT DEFAULT 0,
  `last_active` TIMESTAMP NULL DEFAULT NULL,
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `telegram_id` (`telegram_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- QUIZZES TABLE
CREATE TABLE IF NOT EXISTS `quizzes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `total_points` INT DEFAULT 100,
  `question1` TEXT, `option1a` VARCHAR(255), `option1b` VARCHAR(255), `option1c` VARCHAR(255), `option1d` VARCHAR(255), `correct1` VARCHAR(255),
  `question2` TEXT, `option2a` VARCHAR(255), `option2b` VARCHAR(255), `option2c` VARCHAR(255), `option2d` VARCHAR(255), `correct2` VARCHAR(255),
  `question3` TEXT, `option3a` VARCHAR(255), `option3b` VARCHAR(255), `option3c` VARCHAR(255), `option3d` VARCHAR(255), `correct3` VARCHAR(255),
  `question4` TEXT, `option4a` VARCHAR(255), `option4b` VARCHAR(255), `option4c` VARCHAR(255), `option4d` VARCHAR(255), `correct4` VARCHAR(255),
  `question5` TEXT, `option5a` VARCHAR(255), `option5b` VARCHAR(255), `option5c` VARCHAR(255), `option5d` VARCHAR(255), `correct5` VARCHAR(255),
  `question6` TEXT, `option6a` VARCHAR(255), `option6b` VARCHAR(255), `option6c` VARCHAR(255), `option6d` VARCHAR(255), `correct6` VARCHAR(255),
  `question7` TEXT, `option7a` VARCHAR(255), `option7b` VARCHAR(255), `option7c` VARCHAR(255), `option7d` VARCHAR(255), `correct7` VARCHAR(255),
  `question8` TEXT, `option8a` VARCHAR(255), `option8b` VARCHAR(255), `option8c` VARCHAR(255), `option8d` VARCHAR(255), `correct8` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- QUIZ RESULTS TABLE
CREATE TABLE IF NOT EXISTS `quiz_results` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `quiz_id` INT NOT NULL,
  `score` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES users(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`quiz_id`) REFERENCES quizzes(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TASKS TABLE
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `image_url` VARCHAR(255),
  `task_type` ENUM('YouTube','Instagram','Website','Telegram','Twitter','Custom') DEFAULT 'Custom',
  `reward_coins` INT DEFAULT 0,
  `link` VARCHAR(500),
  `proof_type` ENUM('Screenshot','Text','Both') DEFAULT 'Screenshot',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- TASK SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS `task_submissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `task_id` INT NOT NULL,
  `screenshot_url` MEDIUMTEXT,
  `text_proof` TEXT,
  `status` ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
  `rejection_reason` TEXT,
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES users(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`task_id`) REFERENCES tasks(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SPINS TABLE
CREATE TABLE IF NOT EXISTS `spins` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `reward_amount` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES users(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ADS TABLE
CREATE TABLE IF NOT EXISTS `ads` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `link` VARCHAR(500),
  `reward_coins` DECIMAL(10,2) DEFAULT 10,
  `cooldown_minutes` INT DEFAULT 60,
  `icon` VARCHAR(10) DEFAULT '📺',
  `is_enabled` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- AD VIEWS TABLE
CREATE TABLE IF NOT EXISTS `ad_views` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `ad_id` INT NOT NULL,
  `viewed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES users(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`ad_id`) REFERENCES ads(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- REFERRALS TABLE
CREATE TABLE IF NOT EXISTS `referrals` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `referrer_id` INT NOT NULL,
  `referred_id` INT NOT NULL,
  `coins_earned` INT DEFAULT 0,
  `pending_coins` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`referrer_id`) REFERENCES users(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`referred_id`) REFERENCES users(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- WITHDRAWALS TABLE
CREATE TABLE IF NOT EXISTS `withdrawals` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `method` VARCHAR(50) DEFAULT 'binance',
  `account` VARCHAR(255),
  `status` ENUM('pending','paid','rejected') DEFAULT 'pending',
  `admin_note` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES users(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- DEMO DATA
INSERT IGNORE INTO `users` (`telegram_id`, `name`, `first_name`, `points`, `balance`) VALUES
('123456789', 'Demo User One', 'Demo', 100, 0.10),
('987654321', 'Demo User Two', 'User', 50, 0.05);

INSERT IGNORE INTO `ads` (`title`, `link`, `reward_coins`, `cooldown_minutes`, `icon`, `is_enabled`) VALUES
('Watch Ad 1', 'https://example.com/ad1', 10, 60, '📺', 1),
('Watch Ad 2', 'https://example.com/ad2', 15, 60, '🎬', 1),
('Watch Ad 3', 'https://example.com/ad3', 10, 60, '📱', 1);
