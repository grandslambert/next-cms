import mongoose from 'mongoose';
import { PostType, Taxonomy, Setting } from './models';

/**
 * Initialize default data for a newly created site
 */
export async function initializeSiteDefaults(siteId: mongoose.Types.ObjectId) {
  console.log(`\n📦 Initializing defaults for site ${siteId}...`);

  // Create default post types
  console.log('  📝 Creating default post types...');
  
  const postPostType = await PostType.create({
    site_id: siteId,
    name: 'post',
    slug: 'posts',
    labels: {
      singular_name: 'Post',
      plural_name: 'Posts',
      add_new: 'Add New Post',
      edit_item: 'Edit Post',
      view_item: 'View Post',
      all_items: 'All Posts',
    },
    description: 'Standard blog posts',
    is_hierarchical: false,
    is_public: true,
    supports: ['title', 'editor', 'thumbnail', 'excerpt', 'comments', 'custom_fields', 'author'],
    menu_icon: '📝',
    menu_position: 5,
    show_in_dashboard: true,
    has_archive: true,
    rewrite_slug: 'blog',
    taxonomies: ['category', 'tag'],
  });

  const pagePostType = await PostType.create({
    site_id: siteId,
    name: 'page',
    slug: 'pages',
    labels: {
      singular_name: 'Page',
      plural_name: 'Pages',
      add_new: 'Add New Page',
      edit_item: 'Edit Page',
      view_item: 'View Page',
      all_items: 'All Pages',
    },
    description: 'Static pages',
    is_hierarchical: true,
    is_public: true,
    supports: ['title', 'editor', 'thumbnail', 'excerpt', 'custom_fields', 'author'],
    menu_icon: '📄',
    menu_position: 20,
    show_in_dashboard: true,
    has_archive: false,
    taxonomies: [],
  });

  console.log('  ✓ Created 2 default post types');

  // Create default taxonomies
  console.log('  🏷️  Creating default taxonomies...');

  await Taxonomy.create({
    site_id: siteId,
    name: 'category',
    slug: 'category',
    labels: {
      singular_name: 'Category',
      plural_name: 'Categories',
      all_items: 'All Categories',
      edit_item: 'Edit Category',
      add_new_item: 'Add New Category',
    },
    description: 'Post categories',
    is_hierarchical: true,
    is_public: true,
    show_in_dashboard: true,
    post_types: ['post'],
    rewrite_slug: 'category',
  });

  await Taxonomy.create({
    site_id: siteId,
    name: 'tag',
    slug: 'tag',
    labels: {
      singular_name: 'Tag',
      plural_name: 'Tags',
      all_items: 'All Tags',
      edit_item: 'Edit Tag',
      add_new_item: 'Add New Tag',
    },
    description: 'Post tags',
    is_hierarchical: false,
    is_public: true,
    show_in_dashboard: true,
    post_types: ['post'],
    rewrite_slug: 'tag',
  });

  console.log('  ✓ Created 2 default taxonomies');

  // Create default site settings
  console.log('  ⚙️  Creating default site settings...');

  const defaultSettings = [
    { setting_key: 'site_title', setting_value: 'New Site', setting_type: 'general' },
    { setting_key: 'site_description', setting_value: 'Just another Next CMS site', setting_type: 'general' },
    { setting_key: 'homepage_type', setting_value: 'posts', setting_type: 'reading' },
    { setting_key: 'homepage_page_id', setting_value: '', setting_type: 'reading' },
    { setting_key: 'posts_per_page', setting_value: '10', setting_type: 'reading' },
    { setting_key: 'permalink_structure', setting_value: '/%postname%/', setting_type: 'permalink' },
    { setting_key: 'date_format', setting_value: 'F j, Y', setting_type: 'general' },
    { setting_key: 'time_format', setting_value: 'g:i a', setting_type: 'general' },
    { setting_key: 'timezone', setting_value: 'UTC', setting_type: 'general' },
    { setting_key: 'comments_enabled', setting_value: 'true', setting_type: 'discussion' },
    { setting_key: 'comment_moderation', setting_value: 'false', setting_type: 'discussion' },
    { setting_key: 'media_thumbnail_width', setting_value: '150', setting_type: 'media' },
    { setting_key: 'media_thumbnail_height', setting_value: '150', setting_type: 'media' },
    { setting_key: 'media_medium_width', setting_value: '300', setting_type: 'media' },
    { setting_key: 'media_medium_height', setting_value: '300', setting_type: 'media' },
    { setting_key: 'media_large_width', setting_value: '1024', setting_type: 'media' },
    { setting_key: 'media_large_height', setting_value: '1024', setting_type: 'media' },
  ];

  for (const setting of defaultSettings) {
    await Setting.create({
      site_id: siteId,
      setting_key: setting.setting_key,
      setting_value: setting.setting_value,
      setting_type: setting.setting_type,
    });
  }

  console.log(`  ✓ Created ${defaultSettings.length} default settings`);
  console.log(`✅ Site initialization complete!\n`);

  return {
    postTypes: [postPostType, pagePostType],
    success: true,
  };
}

