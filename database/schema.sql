-- Create database
CREATE DATABASE IF NOT EXISTS nextcms;
USE nextcms;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'editor', 'author') DEFAULT 'author',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Post Types table
CREATE TABLE IF NOT EXISTS post_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  singular_label VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  supports JSON,
  public BOOLEAN DEFAULT TRUE,
  show_in_dashboard BOOLEAN DEFAULT TRUE,
  hierarchical BOOLEAN DEFAULT FALSE,
  menu_position INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
);

-- Posts table (unified for all post types including pages)
CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_type VARCHAR(100) DEFAULT 'post',
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  featured_image_id INT,
  parent_id INT NULL,
  menu_order INT DEFAULT 0,
  status ENUM('draft', 'published', 'trash') DEFAULT 'draft',
  author_id INT NOT NULL,
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (featured_image_id) REFERENCES media(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_id) REFERENCES posts(id) ON DELETE SET NULL,
  INDEX idx_slug (slug),
  INDEX idx_status (status),
  INDEX idx_post_type (post_type),
  INDEX idx_parent_id (parent_id),
  INDEX idx_published_at (published_at)
);

-- Pages table (DEPRECATED - Pages are now managed as post_type='page' in posts table)
-- This table can be dropped after migration:
-- DROP TABLE IF EXISTS pages;

-- Media table
CREATE TABLE IF NOT EXISTS media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  alt_text VARCHAR(255),
  mime_type VARCHAR(100) NOT NULL,
  size INT NOT NULL,
  url VARCHAR(500) NOT NULL,
  sizes JSON,
  uploaded_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_mime_type (mime_type)
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  image_id INT,
  parent_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (image_id) REFERENCES media(id) ON DELETE SET NULL,
  INDEX idx_slug (slug)
);

-- Post-Category relationship table
CREATE TABLE IF NOT EXISTS post_categories (
  post_id INT NOT NULL,
  category_id INT NOT NULL,
  PRIMARY KEY (post_id, category_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key (setting_key)
);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, first_name, last_name, email, password, role) 
VALUES ('admin', 'Admin', 'User', 'admin@example.com', '$2a$10$1llDVX4S7vKlcibiDrrZuespn.U1vHjrhrktHt7fnYSaLqp1cb.Yu', 'admin')
ON DUPLICATE KEY UPDATE email = email;

-- Insert default post types
INSERT INTO post_types (name, label, singular_label, description, icon, supports, show_in_dashboard, hierarchical, menu_position) 
VALUES 
  ('post', 'Posts', 'Post', 'Regular blog posts', '📝', 
   '{"title": true, "content": true, "excerpt": true, "featured_image": true, "categories": true}',
   TRUE, FALSE, 5),
  ('page', 'Pages', 'Page', 'Static pages', '📄',
   '{"title": true, "content": true, "featured_image": true, "categories": false}',
   TRUE, TRUE, 10)
ON DUPLICATE KEY UPDATE 
  label = VALUES(label),
  hierarchical = VALUES(hierarchical);

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, setting_type) VALUES
('site_name', 'Next CMS', 'string'),
('site_tagline', 'A powerful content management system', 'string'),
('site_description', 'Built with Next.js, Tailwind CSS, and MySQL', 'string'),
('image_sizes', '{"thumbnail":{"width":150,"height":150,"crop":"cover"},"medium":{"width":300,"height":300,"crop":"inside"},"large":{"width":1024,"height":1024,"crop":"inside"}}', 'json')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

