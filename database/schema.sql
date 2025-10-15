-- Note: Run this script while connected to your database
-- It will use whatever database you're currently connected to

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

-- Taxonomies table (defines taxonomy types like "category", "tag", etc.)
CREATE TABLE IF NOT EXISTS taxonomies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  singular_label VARCHAR(255) NOT NULL,
  description TEXT,
  hierarchical BOOLEAN DEFAULT FALSE,
  public BOOLEAN DEFAULT TRUE,
  show_in_menu BOOLEAN DEFAULT TRUE,
  menu_position INT DEFAULT 20,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
);

-- Terms table (stores individual taxonomy terms)
CREATE TABLE IF NOT EXISTS terms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  taxonomy_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  image_id INT,
  parent_id INT NULL,
  count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (taxonomy_id) REFERENCES taxonomies(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES terms(id) ON DELETE SET NULL,
  FOREIGN KEY (image_id) REFERENCES media(id) ON DELETE SET NULL,
  UNIQUE KEY unique_slug_per_taxonomy (taxonomy_id, slug),
  INDEX idx_taxonomy (taxonomy_id),
  INDEX idx_slug (slug)
);

-- Term Relationships table (many-to-many between posts and terms)
CREATE TABLE IF NOT EXISTS term_relationships (
  post_id INT NOT NULL,
  term_id INT NOT NULL,
  PRIMARY KEY (post_id, term_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
  INDEX idx_post (post_id),
  INDEX idx_term (term_id)
);

-- Taxonomy-PostType relationship (which taxonomies apply to which post types)
CREATE TABLE IF NOT EXISTS post_type_taxonomies (
  post_type_id INT NOT NULL,
  taxonomy_id INT NOT NULL,
  PRIMARY KEY (post_type_id, taxonomy_id),
  FOREIGN KEY (post_type_id) REFERENCES post_types(id) ON DELETE CASCADE,
  FOREIGN KEY (taxonomy_id) REFERENCES taxonomies(id) ON DELETE CASCADE
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
   '{"title": true, "content": true, "excerpt": true, "featured_image": true}',
   TRUE, FALSE, 5),
  ('page', 'Pages', 'Page', 'Static pages', '📄',
   '{"title": true, "content": true, "featured_image": true}',
   TRUE, TRUE, 10)
ON DUPLICATE KEY UPDATE 
  label = VALUES(label),
  hierarchical = VALUES(hierarchical);

-- Insert default taxonomies
INSERT INTO taxonomies (name, label, singular_label, description, hierarchical, show_in_menu, menu_position)
VALUES 
  ('category', 'Categories', 'Category', 'Organize content into categories', TRUE, TRUE, 15),
  ('tag', 'Tags', 'Tag', 'Add tags to your content', FALSE, TRUE, 16)
ON DUPLICATE KEY UPDATE 
  label = VALUES(label),
  hierarchical = VALUES(hierarchical);

-- Link default taxonomies to post types
-- Get the IDs and create relationships (Categories for Posts, Tags for Posts)
INSERT INTO post_type_taxonomies (post_type_id, taxonomy_id)
SELECT pt.id, t.id
FROM post_types pt, taxonomies t
WHERE (pt.name = 'post' AND t.name IN ('category', 'tag'))
ON DUPLICATE KEY UPDATE post_type_id = post_type_id;

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, setting_type) VALUES
('site_name', 'Next CMS', 'string'),
('site_tagline', 'A powerful content management system', 'string'),
('site_description', 'Built with Next.js, Tailwind CSS, and MySQL', 'string'),
('image_sizes', '{"thumbnail":{"width":150,"height":150,"crop":"cover"},"medium":{"width":300,"height":300,"crop":"inside"},"large":{"width":1024,"height":1024,"crop":"inside"}}', 'json')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

