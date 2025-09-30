-- TamanEdu MySQL Database Schema
-- Run this in your MySQL database

-- Create database (run this first)
-- CREATE DATABASE tamanedu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE tamanedu;

-- Create users table (replaces Supabase auth.users)
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
);

-- Create grading_sessions table
CREATE TABLE grading_sessions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    teacher_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    status ENUM('draft', 'completed', 'archived') DEFAULT 'draft',
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_grading_sessions_teacher_id (teacher_id),
    INDEX idx_grading_sessions_status (status)
);

-- Create answer_keys table
CREATE TABLE answer_keys (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    session_id CHAR(36) NOT NULL,
    question_number INT NOT NULL,
    correct_answer TEXT NOT NULL,
    accepted_variants JSON DEFAULT ('[]'),
    points DECIMAL(5,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES grading_sessions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_question (session_id, question_number),
    INDEX idx_answer_keys_session_id (session_id)
);

-- Create students table
CREATE TABLE students (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    session_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    student_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES grading_sessions(id) ON DELETE CASCADE,
    INDEX idx_students_session_id (session_id)
);

-- Create responses table
CREATE TABLE responses (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    student_id CHAR(36) NOT NULL,
    question_number INT NOT NULL,
    raw_answer TEXT NOT NULL,
    normalized_answer TEXT NOT NULL,
    ocr_confidence DECIMAL(3,2) NOT NULL,
    is_flagged BOOLEAN DEFAULT FALSE,
    page_number INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_question (student_id, question_number),
    INDEX idx_responses_student_id (student_id),
    INDEX idx_responses_flagged (is_flagged)
);

-- Create grades table
CREATE TABLE grades (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    student_id CHAR(36) NOT NULL,
    question_number INT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    points_earned DECIMAL(5,2) NOT NULL,
    points_possible DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_grade (student_id, question_number),
    INDEX idx_grades_student_id (student_id)
);

-- Create file_uploads table (replaces Supabase storage)
CREATE TABLE file_uploads (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    session_id CHAR(36),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    upload_type ENUM('worksheet', 'answer_key', 'export') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES grading_sessions(id) ON DELETE CASCADE,
    INDEX idx_file_uploads_user_id (user_id),
    INDEX idx_file_uploads_session_id (session_id),
    INDEX idx_file_uploads_type (upload_type)
);

-- Create sessions table for JWT token management (optional - for token blacklisting)
CREATE TABLE user_sessions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_sessions_user_id (user_id),
    INDEX idx_user_sessions_token_hash (token_hash),
    INDEX idx_user_sessions_expires_at (expires_at)
);

-- Create indexes for better performance
CREATE INDEX idx_grading_sessions_updated_at ON grading_sessions(updated_at DESC);
CREATE INDEX idx_responses_confidence ON responses(ocr_confidence);
CREATE INDEX idx_grades_is_correct ON grades(is_correct);

-- Insert a default admin user (optional - for testing)
-- Password is 'admin123' - change this immediately!
INSERT INTO users (id, email, password_hash, email_verified) VALUES 
(UUID(), 'admin@tamanedu.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj5B4x1B4x1B', TRUE);

-- Create a procedure to clean up expired sessions (optional)
DELIMITER //
CREATE PROCEDURE CleanupExpiredSessions()
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END //
DELIMITER ;

-- Create an event to run cleanup daily (optional)
-- SET GLOBAL event_scheduler = ON;
-- CREATE EVENT IF NOT EXISTS cleanup_sessions
-- ON SCHEDULE EVERY 1 DAY
-- STARTS CURRENT_TIMESTAMP
-- DO CALL CleanupExpiredSessions();

