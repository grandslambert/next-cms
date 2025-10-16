-- Note: Run this script while connected to your database
-- It will use whatever database you're currently connected to

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  permissions JSON,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role_id INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- User Meta table (for user preferences and settings)
CREATE TABLE IF NOT EXISTS user_meta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  meta_key VARCHAR(255) NOT NULL,
  meta_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_meta_key (meta_key),
  UNIQUE KEY unique_user_meta (user_id, meta_key)
);

-- Post Types table
CREATE TABLE IF NOT EXISTS post_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  singular_label VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  url_structure ENUM('default', 'year', 'year_month', 'year_month_day') DEFAULT 'default',
  supports JSON,
  public BOOLEAN DEFAULT TRUE,
  show_in_dashboard BOOLEAN DEFAULT TRUE,
  hierarchical BOOLEAN DEFAULT FALSE,
  menu_position INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_slug (slug)
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
  status ENUM('draft', 'pending', 'published', 'scheduled', 'trash') DEFAULT 'draft',
  author_id INT NOT NULL,
  published_at TIMESTAMP NULL,
  scheduled_publish_at TIMESTAMP NULL,
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

-- Post Revisions table
CREATE TABLE IF NOT EXISTS post_revisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  excerpt TEXT,
  custom_fields JSON,
  author_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_post_id (post_id),
  INDEX idx_created_at (created_at)
);

-- Post Meta (Custom Fields) table
CREATE TABLE IF NOT EXISTS post_meta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  meta_key VARCHAR(255) NOT NULL,
  meta_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  INDEX idx_post_id (post_id),
  INDEX idx_meta_key (meta_key),
  UNIQUE KEY unique_post_meta (post_id, meta_key)
);

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
  folder_id INT NULL,
  uploaded_by INT NOT NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (folder_id) REFERENCES media_folders(id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_mime_type (mime_type),
  INDEX idx_folder (folder_id),
  INDEX idx_deleted (deleted_at)
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
  show_in_dashboard BOOLEAN DEFAULT FALSE,
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


-- Media folders table
CREATE TABLE IF NOT EXISTS media_folders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES media_folders(id) ON DELETE CASCADE,
  INDEX idx_parent (parent_id)
);

-- Menus table (navigation menus)
CREATE TABLE IF NOT EXISTS menus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  location VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_location (location)
);

-- Menu items table (individual menu entries)
CREATE TABLE IF NOT EXISTS menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  menu_id INT NOT NULL,
  parent_id INT NULL,
  type ENUM('post', 'post_type', 'taxonomy', 'term', 'custom') NOT NULL,
  object_id INT NULL,
  post_type VARCHAR(100) NULL,
  custom_url VARCHAR(500),
  custom_label VARCHAR(255),
  menu_order INT DEFAULT 0,
  target VARCHAR(20) DEFAULT '_self',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  INDEX idx_menu (menu_id),
  INDEX idx_parent (parent_id),
  INDEX idx_order (menu_order)
);

-- Menu item meta table (for advanced fields)
CREATE TABLE IF NOT EXISTS menu_item_meta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  menu_item_id INT NOT NULL,
  meta_key VARCHAR(255) NOT NULL,
  meta_value TEXT NULL,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  UNIQUE KEY unique_menu_item_meta (menu_item_id, meta_key)
);

-- Menu locations table (predefined locations for theme integration)
CREATE TABLE IF NOT EXISTS menu_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  is_builtin BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Activity Log table for audit trail
CREATE TABLE IF NOT EXISTS activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NULL,
  entity_name VARCHAR(255) NULL,
  details TEXT NULL,
  changes_before JSON NULL,
  changes_after JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_entity_type (entity_type),
  INDEX idx_entity_id (entity_id),
  INDEX idx_created_at (created_at)
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

-- Insert default roles
-- Note: Post type permissions (manage_posts_post, manage_posts_page) will be added dynamically
-- when post types are created. These base permissions are the minimum set.
INSERT INTO roles (id, name, display_name, description, permissions, is_system) VALUES
(1, 'admin', 'Administrator', 'Full access to all features', 
 '{"view_dashboard": true, "view_others_posts": true, "manage_posts_post": true, "manage_posts_page": true, "manage_others_posts": true, "can_publish": true, "can_delete": true, "can_delete_others": true, "manage_media": true, "manage_taxonomies": true, "manage_users": true, "manage_roles": true, "manage_post_types": true, "manage_settings": true}', 
 true),
(2, 'editor', 'Editor', 'Can manage and publish all content', 
 '{"view_dashboard": true, "view_others_posts": false, "manage_posts_post": true, "manage_posts_page": true, "manage_others_posts": true, "can_publish": true, "can_delete": true, "can_delete_others": true, "manage_media": true, "manage_taxonomies": true, "manage_users": false, "manage_roles": false, "manage_post_types": false, "manage_settings": false}', 
 true),
(3, 'author', 'Author', 'Can create and edit own posts', 
 '{"view_dashboard": true, "view_others_posts": false, "manage_posts_post": true, "manage_posts_page": true, "manage_others_posts": false, "can_publish": true, "can_delete": true, "can_delete_others": false, "manage_media": true, "manage_taxonomies": false, "manage_users": false, "manage_roles": false, "manage_post_types": false, "manage_settings": false}', 
 true)
ON DUPLICATE KEY UPDATE name = name;

-- Insert default admin user (password: admin123)
INSERT INTO users (username, first_name, last_name, email, password, role_id) 
VALUES ('admin', 'Admin', 'User', 'admin@example.com', '$2a$10$1llDVX4S7vKlcibiDrrZuespn.U1vHjrhrktHt7fnYSaLqp1cb.Yu', 1)
ON DUPLICATE KEY UPDATE email = email;

-- Insert default post types
INSERT INTO post_types (name, slug, label, singular_label, description, icon, url_structure, supports, show_in_dashboard, hierarchical, menu_position) 
VALUES 
  ('post', 'blog', 'Posts', 'Post', 'Regular blog posts', '📝', 'default',
   '{"title": true, "content": true, "excerpt": true, "featured_image": true}',
   TRUE, FALSE, 5),
  ('page', '', 'Pages', 'Page', 'Static pages', '📄', 'default',
   '{"title": true, "content": true, "featured_image": true}',
   TRUE, TRUE, 10)
ON DUPLICATE KEY UPDATE 
  label = VALUES(label),
  hierarchical = VALUES(hierarchical),
  slug = VALUES(slug),
  url_structure = VALUES(url_structure);

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

