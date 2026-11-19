CREATE DATABASE IF NOT EXISTS campus_reservation;
USE campus_reservation;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student','faculty','staff','admin') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS venues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(150),
  capacity INT NOT NULL DEFAULT 0,
  description TEXT,
  is_active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  venue_id INT NOT NULL,
  purpose VARCHAR(255) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  remarks VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (venue_id) REFERENCES venues(id),
  INDEX idx_venue_time (venue_id, start_time, end_time)
);

INSERT INTO venues (name, location, capacity, description) VALUES
('University Gymnasium', 'Main Campus', 800, 'Indoor court for sports and large events'),
('AVR (Audio-Visual Room)', 'Academic Building, 2nd Floor', 120, 'Air-conditioned room with projector and sound system'),
('Function Hall', 'Administration Building', 200, 'Seminars, programs, and meetings'),
('Computer Laboratory 1', 'IT Building', 40, 'Workstations for classes and training'),
('Open Court', 'Campus Grounds', 300, 'Outdoor court for activities');
-- Create the admin account by running: npm run seed  (inside /backend)
