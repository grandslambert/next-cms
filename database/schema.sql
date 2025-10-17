-- Next CMS Multi-Site Database Schema
-- This schema creates a multi-site CMS from the start
-- Run this script while connected to your database

-- =====================================================================
-- GLOBAL TABLES (shared across all sites)
-- =====================================================================

-- Sites table (for multi-site support) - must be created first for foreign keys
CREATE TABLE IF NOT EXISTS sites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_domain (domain),
  INDEX idx_active (is_active)
);

-- Roles table (can be global or site-specific)
-- NULL site_id = global/system role, otherwise scoped to specific site
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  permissions JSON,
  is_system BOOLEAN DEFAULT FALSE,
  site_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  INDEX idx_name (name),
  INDEX idx_site (site_id),
  UNIQUE KEY unique_role_name_site (name, site_id)
);

-- Users table (global - users can be assigned to multiple sites)
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
  FOREIGN KEY (role_id) REFERENCES roles(id),
  INDEX idx_username (username),
  INDEX idx_email (email)
);

-- User Meta table (global user preferences)
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

-- Site Users table (maps users to sites with roles)
CREATE TABLE IF NOT EXISTS site_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  UNIQUE KEY unique_site_user (site_id, user_id),
  INDEX idx_site (site_id),
  INDEX idx_user (user_id),
  INDEX idx_role (role_id)
);

-- Site Role Overrides table (stores site-specific permission customizations)
-- Allows each site to customize global/system roles without affecting other sites
CREATE TABLE IF NOT EXISTS site_role_overrides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  site_id INT NOT NULL,
  role_id INT NOT NULL,
  permissions JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_site_role (site_id, role_id),
  INDEX idx_site (site_id),
  INDEX idx_role (role_id)
);

-- Activity Log table (global audit trail with site_id)
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
  site_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_entity_type (entity_type),
  INDEX idx_entity_id (entity_id),
  INDEX idx_site_id (site_id),
  INDEX idx_created_at (created_at)
);

-- Global Settings table (system-wide settings)
CREATE TABLE IF NOT EXISTS global_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key)
);

-- Insert default global settings
INSERT INTO global_settings (setting_key, setting_value, setting_type, description) VALUES
('auth_hide_default_user', '0', 'boolean', 'Hide default user credentials on login page')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- =====================================================================
-- SITE 1 TABLES (default site)
-- =====================================================================

-- Media folders table (Site 1)
CREATE TABLE IF NOT EXISTS site_1_media_folders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES site_1_media_folders(id) ON DELETE CASCADE,
  INDEX idx_parent (parent_id)
);

-- Media table (Site 1)
CREATE TABLE IF NOT EXISTS site_1_media (
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
  FOREIGN KEY (folder_id) REFERENCES site_1_media_folders(id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_mime_type (mime_type),
  INDEX idx_folder (folder_id),
  INDEX idx_deleted (deleted_at)
);

-- Post Types table (Site 1)
CREATE TABLE IF NOT EXISTS site_1_post_types (
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

-- Posts table (Site 1)
CREATE TABLE IF NOT EXISTS site_1_posts (
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
  FOREIGN KEY (featured_image_id) REFERENCES site_1_media(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_id) REFERENCES site_1_posts(id) ON DELETE SET NULL,
  INDEX idx_slug (slug),
  INDEX idx_status (status),
  INDEX idx_post_type (post_type),
  INDEX idx_parent_id (parent_id),
  INDEX idx_author_id (author_id),
  INDEX idx_published_at (published_at),
  INDEX idx_scheduled_publish_at (scheduled_publish_at)
);

-- Post Revisions table (Site 1)
CREATE TABLE IF NOT EXISTS site_1_post_revisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  excerpt TEXT,
  custom_fields JSON,
  author_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES site_1_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_post_id (post_id),
  INDEX idx_created_at (created_at)
);

-- Post Meta table (Site 1)
CREATE TABLE IF NOT EXISTS site_1_post_meta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  meta_key VARCHAR(255) NOT NULL,
  meta_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES site_1_posts(id) ON DELETE CASCADE,
  INDEX idx_post_id (post_id),
  INDEX idx_meta_key (meta_key),
  UNIQUE KEY unique_post_meta (post_id, meta_key)
);

-- Taxonomies table (Site 1)
CREATE TABLE IF NOT EXISTS site_1_taxonomies (
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

-- Terms table (Site 1)
CREATE TABLE IF NOT EXISTS site_1_terms (
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
  FOREIGN KEY (taxonomy_id) REFERENCES site_1_taxonomies(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES site_1_terms(id) ON DELETE SET NULL,
  FOREIGN KEY (image_id) REFERENCES site_1_media(id) ON DELETE SET NULL,
  UNIQUE KEY unique_slug_per_taxonomy (taxonomy_id, slug),
  INDEX idx_taxonomy (taxonomy_id),
  INDEX idx_slug (slug),
  INDEX idx_parent (parent_id)
);

-- Term Meta table (Site 1)
CREATE TABLE IF NOT EXISTS site_1_term_meta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  term_id INT NOT NULL,
  meta_key VARCHAR(255) NOT NULL,
  meta_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (term_id) REFERENCES site_1_terms(id) ON DELETE CASCADE,
  INDEX idx_term_id (term_id),
  INDEX idx_meta_key (meta_key),
  UNIQUE KEY unique_term_meta (term_id, meta_key)
);

-- Term Relationships table (Site 1)
CREATE TABLE IF NOT EXISTS site_1_term_relationships (
  post_id INT NOT NULL,
  term_id INT NOT NULL,
  PRIMARY KEY (post_id, term_id),
  FOREIGN KEY (post_id) REFERENCES site_1_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES site_1_terms(id) ON DELETE CASCADE,
  INDEX idx_post (post_id),
  INDEX idx_term (term_id)
);

-- Taxonomy-PostType relationship (Site 1)
CREATE TABLE IF NOT EXISTS site_1_post_type_taxonomies (
  post_type_id INT NOT NULL,
  taxonomy_id INT NOT NULL,
  PRIMARY KEY (post_type_id, taxonomy_id),
  FOREIGN KEY (post_type_id) REFERENCES site_1_post_types(id) ON DELETE CASCADE,
  FOREIGN KEY (taxonomy_id) REFERENCES site_1_taxonomies(id) ON DELETE CASCADE
);

-- Menus table (Site 1)
CREATE TABLE IF NOT EXISTS site_1_menus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  location VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_location (location)
);

-- Menu items table (Site 1)
CREATE TABLE IF NOT EXISTS site_1_menu_items (
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
  FOREIGN KEY (menu_id) REFERENCES site_1_menus(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES site_1_menu_items(id) ON DELETE CASCADE,
  INDEX idx_menu (menu_id),
  INDEX idx_parent (parent_id),
  INDEX idx_order (menu_order)
);

-- Menu item meta table (Site 1)
CREATE TABLE IF NOT EXISTS site_1_menu_item_meta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  menu_item_id INT NOT NULL,
  meta_key VARCHAR(255) NOT NULL,
  meta_value TEXT NULL,
  FOREIGN KEY (menu_item_id) REFERENCES site_1_menu_items(id) ON DELETE CASCADE,
  UNIQUE KEY unique_menu_item_meta (menu_item_id, meta_key),
  INDEX idx_menu_item (menu_item_id)
);

-- Menu locations table (Site 1)
CREATE TABLE IF NOT EXISTS site_1_menu_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  is_builtin BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
);

-- Settings table (Site 1)
CREATE TABLE IF NOT EXISTS site_1_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key (setting_key)
);

-- =====================================================================
-- DEFAULT DATA
-- =====================================================================

-- Insert default site
INSERT INTO sites (id, name, display_name, description, is_active) VALUES
(1, 'site_1', 'Site 1', 'Default site', TRUE)
ON DUPLICATE KEY UPDATE name = name;

-- Insert default roles (site_id = NULL means global/system roles)
INSERT INTO roles (id, name, display_name, description, permissions, is_system, site_id) VALUES
(0, 'super_admin', 'Super Administrator', 'Full unrestricted access to all features - bypasses all permission checks', 
 '{"is_super_admin": true}', 
 true, NULL),
(1, 'admin', 'Administrator', 'Full access to site features', 
 '{"view_dashboard": true, "view_others_posts": true, "manage_posts_post": true, "manage_posts_page": true, "manage_others_posts": true, "can_publish": true, "can_delete": true, "can_delete_others": true, "can_reassign": true, "manage_media": true, "manage_taxonomies": true, "manage_users": true, "manage_roles": true, "manage_post_types": true, "manage_settings": true, "manage_menus": true}', 
 true, NULL),
(2, 'editor', 'Editor', 'Can manage and publish all content', 
 '{"view_dashboard": true, "view_others_posts": false, "manage_posts_post": true, "manage_posts_page": true, "manage_others_posts": true, "can_publish": true, "can_delete": true, "can_delete_others": true, "can_reassign": false, "manage_media": true, "manage_taxonomies": true, "manage_users": false, "manage_roles": false, "manage_post_types": false, "manage_settings": false, "manage_menus": false}', 
 true, NULL),
(3, 'author', 'Author', 'Can create and edit own posts', 
 '{"view_dashboard": true, "view_others_posts": false, "manage_posts_post": true, "manage_posts_page": true, "manage_others_posts": false, "can_publish": true, "can_delete": true, "can_delete_others": false, "can_reassign": false, "manage_media": true, "manage_taxonomies": false, "manage_users": false, "manage_roles": false, "manage_post_types": false, "manage_settings": false, "manage_menus": false}', 
 true, NULL),
(4, 'guest', 'Guest', 'Read-only access - can view public content only', 
 '{"view_dashboard": false, "view_others_posts": false, "manage_posts_post": false, "manage_posts_page": false, "manage_others_posts": false, "can_publish": false, "can_delete": false, "can_delete_others": false, "manage_media": false, "manage_taxonomies": false, "manage_users": false, "manage_roles": false, "manage_post_types": false, "manage_settings": false, "manage_menus": false}', 
 true, NULL)
ON DUPLICATE KEY UPDATE name = name;

-- Insert Super Administrator (password: SuperAdmin123!)
-- This user can manage all sites and users
INSERT INTO users (username, first_name, last_name, email, password, role_id) 
VALUES ('superadmin', 'Super', 'Admin', 'superadmin@example.com', '$2a$10$qT01LEEhLjHSdm9GMA9SuucISjUHODT8GUI93.e6dc83gZXQ3k6GO', 0)
ON DUPLICATE KEY UPDATE email = email;

-- Insert Site Administrator for Site 1 (password: SiteAdmin123!)
-- This user manages Site 1
INSERT INTO users (username, first_name, last_name, email, password, role_id) 
VALUES ('siteadmin', 'Site', 'Admin', 'admin@site1.com', '$2a$10$9zeKiRplWuLPI0hMB8zQYumhk/E2Oa8kyu6M1ARz20hs0FXkld70G', 1)
ON DUPLICATE KEY UPDATE email = email;

-- Assign Site Administrator to Site 1
-- Note: This will only work if siteadmin user was created (which it should be above)
INSERT IGNORE INTO site_users (site_id, user_id, role_id)
SELECT 1, id, 1
FROM users
WHERE username = 'siteadmin'
LIMIT 1;

-- Insert default post types for Site 1
INSERT INTO site_1_post_types (id, name, slug, label, singular_label, description, icon, url_structure, supports, show_in_dashboard, hierarchical, menu_position) 
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

-- Insert default taxonomies for Site 1
INSERT INTO site_1_taxonomies (id, name, label, singular_label, description, hierarchical, show_in_menu, menu_position)
VALUES 
  (1, 'category', 'Categories', 'Category', 'Organize content into categories', TRUE, TRUE, 1),
  (2, 'tag', 'Tags', 'Tag', 'Add tags to your content', FALSE, TRUE, 2)
ON DUPLICATE KEY UPDATE 
  label = VALUES(label),
  hierarchical = VALUES(hierarchical);

-- Link default taxonomies to post types for Site 1
INSERT INTO site_1_post_type_taxonomies (post_type_id, taxonomy_id)
SELECT pt.id, t.id
FROM site_1_post_types pt, site_1_taxonomies t
WHERE (pt.name = 'post' AND t.name IN ('category', 'tag'))
ON DUPLICATE KEY UPDATE post_type_id = post_type_id;

-- Insert default menu locations for Site 1
INSERT INTO site_1_menu_locations (name, description, is_builtin) VALUES
('header', 'Main header navigation', 1),
('footer', 'Footer navigation', 1),
('sidebar', 'Sidebar navigation', 1)
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Insert default settings for Site 1
INSERT INTO site_1_settings (setting_key, setting_value, setting_type) VALUES
('site_name', 'Next CMS', 'string'),
('site_tagline', 'A powerful content management system', 'string'),
('site_description', 'Built with Next.js, Tailwind CSS, and MySQL', 'string'),
('image_sizes', '{"thumbnail":{"width":150,"height":150,"crop":"cover"},"medium":{"width":300,"height":300,"crop":"inside"},"large":{"width":1024,"height":1024,"crop":"inside"}}', 'json')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- =====================================================================
-- SETUP COMPLETE
-- =====================================================================
-- Default Super Admin Login: superadmin / SuperAdmin123!
-- Default Site Admin Login: siteadmin / SiteAdmin123!
-- =====================================================================
