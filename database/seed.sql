-- Sample data for testing (optional)
USE nextcms;

-- Insert sample categories
INSERT INTO categories (name, slug, description) VALUES
('Technology', 'technology', 'Posts about technology and programming'),
('Lifestyle', 'lifestyle', 'Lifestyle and personal development posts'),
('Business', 'business', 'Business and entrepreneurship content');

-- Insert sample posts (requires admin user with id=1)
INSERT INTO posts (title, slug, content, excerpt, status, author_id, published_at) VALUES
('Welcome to Next CMS', 'welcome-to-next-cms', 
'<h2>Getting Started</h2><p>Welcome to your new CMS! This is a sample post to get you started.</p><p>You can create, edit, and delete posts from the admin panel.</p>', 
'Learn how to get started with Next CMS', 
'published', 1, NOW()),

('Building Modern Web Applications', 'building-modern-web-applications',
'<h2>Modern Web Development</h2><p>Next.js provides an excellent foundation for building modern web applications with React.</p><p>Combined with Tailwind CSS and MySQL, you have a powerful stack for creating dynamic websites.</p>',
'Exploring modern web development with Next.js',
'published', 1, NOW());

-- Insert sample page
INSERT INTO pages (title, slug, content, status, author_id, published_at) VALUES
('About', 'about',
'<h2>About This CMS</h2><p>Next CMS is a modern content management system built with the latest web technologies.</p><p>It provides all the features you need to manage your content effectively.</p>',
'published', 1, NOW());

