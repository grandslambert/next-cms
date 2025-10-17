-- Site-Specific Tables Template
-- Replace {PREFIX} with site_<id>_ for each site
-- This template is used to create tables for new sites

-- Media folders table
CREATE TABLE IF NOT EXISTS {PREFIX}media_folders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES {PREFIX}media_folders(id) ON DELETE CASCADE,
  INDEX idx_parent (parent_id)
);

-- Media table
CREATE TABLE IF NOT EXISTS {PREFIX}media (
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
  FOREIGN KEY (folder_id) REFERENCES {PREFIX}media_folders(id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_mime_type (mime_type),
  INDEX idx_folder (folder_id),
  INDEX idx_deleted (deleted_at)
);

-- Post Types table
CREATE TABLE IF NOT EXISTS {PREFIX}post_types (
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

-- Posts table
CREATE TABLE IF NOT EXISTS {PREFIX}posts (
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
  FOREIGN KEY (featured_image_id) REFERENCES {PREFIX}media(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_id) REFERENCES {PREFIX}posts(id) ON DELETE SET NULL,
  INDEX idx_slug (slug),
  INDEX idx_status (status),
  INDEX idx_post_type (post_type),
  INDEX idx_parent_id (parent_id),
  INDEX idx_author_id (author_id),
  INDEX idx_published_at (published_at),
  INDEX idx_scheduled_publish_at (scheduled_publish_at)
);

-- Post Revisions table
CREATE TABLE IF NOT EXISTS {PREFIX}post_revisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  excerpt TEXT,
  custom_fields JSON,
  author_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES {PREFIX}posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_post_id (post_id),
  INDEX idx_created_at (created_at)
);

-- Post Meta table
CREATE TABLE IF NOT EXISTS {PREFIX}post_meta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  meta_key VARCHAR(255) NOT NULL,
  meta_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES {PREFIX}posts(id) ON DELETE CASCADE,
  INDEX idx_post_id (post_id),
  INDEX idx_meta_key (meta_key),
  UNIQUE KEY unique_post_meta (post_id, meta_key)
);

-- Taxonomies table
CREATE TABLE IF NOT EXISTS {PREFIX}taxonomies (
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

-- Terms table
CREATE TABLE IF NOT EXISTS {PREFIX}terms (
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
  FOREIGN KEY (taxonomy_id) REFERENCES {PREFIX}taxonomies(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES {PREFIX}terms(id) ON DELETE SET NULL,
  FOREIGN KEY (image_id) REFERENCES {PREFIX}media(id) ON DELETE SET NULL,
  UNIQUE KEY unique_slug_per_taxonomy (taxonomy_id, slug),
  INDEX idx_taxonomy (taxonomy_id),
  INDEX idx_slug (slug),
  INDEX idx_parent (parent_id)
);

-- Term Meta table
CREATE TABLE IF NOT EXISTS {PREFIX}term_meta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  term_id INT NOT NULL,
  meta_key VARCHAR(255) NOT NULL,
  meta_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (term_id) REFERENCES {PREFIX}terms(id) ON DELETE CASCADE,
  INDEX idx_term_id (term_id),
  INDEX idx_meta_key (meta_key),
  UNIQUE KEY unique_term_meta (term_id, meta_key)
);

-- Term Relationships table
CREATE TABLE IF NOT EXISTS {PREFIX}term_relationships (
  post_id INT NOT NULL,
  term_id INT NOT NULL,
  PRIMARY KEY (post_id, term_id),
  FOREIGN KEY (post_id) REFERENCES {PREFIX}posts(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES {PREFIX}terms(id) ON DELETE CASCADE,
  INDEX idx_post (post_id),
  INDEX idx_term (term_id)
);

-- Post Type Taxonomies relationship table
CREATE TABLE IF NOT EXISTS {PREFIX}post_type_taxonomies (
  post_type_id INT NOT NULL,
  taxonomy_id INT NOT NULL,
  PRIMARY KEY (post_type_id, taxonomy_id),
  FOREIGN KEY (post_type_id) REFERENCES {PREFIX}post_types(id) ON DELETE CASCADE,
  FOREIGN KEY (taxonomy_id) REFERENCES {PREFIX}taxonomies(id) ON DELETE CASCADE
);

-- Menus table
CREATE TABLE IF NOT EXISTS {PREFIX}menus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  location VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_location (location)
);

-- Menu items table
CREATE TABLE IF NOT EXISTS {PREFIX}menu_items (
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
  FOREIGN KEY (menu_id) REFERENCES {PREFIX}menus(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES {PREFIX}menu_items(id) ON DELETE CASCADE,
  INDEX idx_menu (menu_id),
  INDEX idx_parent (parent_id),
  INDEX idx_order (menu_order)
);

-- Menu item meta table
CREATE TABLE IF NOT EXISTS {PREFIX}menu_item_meta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  menu_item_id INT NOT NULL,
  meta_key VARCHAR(255) NOT NULL,
  meta_value TEXT NULL,
  FOREIGN KEY (menu_item_id) REFERENCES {PREFIX}menu_items(id) ON DELETE CASCADE,
  UNIQUE KEY unique_menu_item_meta (menu_item_id, meta_key),
  INDEX idx_menu_item (menu_item_id)
);

-- Menu locations table
CREATE TABLE IF NOT EXISTS {PREFIX}menu_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  is_builtin BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
);

-- Activity Log table
CREATE TABLE IF NOT EXISTS {PREFIX}activity_log (
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
CREATE TABLE IF NOT EXISTS {PREFIX}settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key (setting_key)
);

-- Insert default post types
INSERT INTO {PREFIX}post_types (id, name, slug, label, singular_label, description, icon, url_structure, supports, show_in_dashboard, hierarchical, menu_position) 
VALUES 
  (1, 'post', 'blog', 'Posts', 'Post', 'Regular blog posts', '📝', 'default',
   '{"title": true, "content": true, "excerpt": true, "featured_image": true}',
   TRUE, FALSE, 5),
  (2, 'page', '', 'Pages', 'Page', 'Static pages', '📄', 'default',
   '{"title": true, "content": true, "featured_image": true}',
   TRUE, TRUE, 10)
ON DUPLICATE KEY UPDATE 
  label = VALUES(label),
  hierarchical = VALUES(hierarchical),
  slug = VALUES(slug),
  url_structure = VALUES(url_structure);

-- Insert default taxonomies
INSERT INTO {PREFIX}taxonomies (id, name, label, singular_label, description, hierarchical, show_in_menu, menu_position)
VALUES 
  (1, 'category', 'Categories', 'Category', 'Organize content into categories', TRUE, TRUE, 1),
  (2, 'tag', 'Tags', 'Tag', 'Add tags to your content', FALSE, TRUE, 2)
ON DUPLICATE KEY UPDATE 
  label = VALUES(label),
  hierarchical = VALUES(hierarchical);

-- Link default taxonomies to post types
INSERT INTO {PREFIX}post_type_taxonomies (post_type_id, taxonomy_id)
SELECT pt.id, t.id
FROM {PREFIX}post_types pt, {PREFIX}taxonomies t
WHERE (pt.name = 'post' AND t.name IN ('category', 'tag'))
ON DUPLICATE KEY UPDATE post_type_id = post_type_id;

-- Insert default menu locations
INSERT INTO {PREFIX}menu_locations (name, description, is_builtin) VALUES
('header', 'Main header navigation', 1),
('footer', 'Footer navigation', 1),
('sidebar', 'Sidebar navigation', 1)
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Insert default settings
INSERT INTO {PREFIX}settings (setting_key, setting_value, setting_type) VALUES
('site_name', 'Next CMS', 'string'),
('site_tagline', 'A powerful content management system', 'string'),
('site_description', 'Built with Next.js, Tailwind CSS, and MySQL', 'string'),
('image_sizes', '{"thumbnail":{"width":150,"height":150,"crop":"cover"},"medium":{"width":300,"height":300,"crop":"inside"},"large":{"width":1024,"height":1024,"crop":"inside"}}', 'json')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

