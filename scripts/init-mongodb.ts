/**
 * MongoDB Database Initialization Script
 * Creates initial collections, indexes, and seed data
 * 
 * Usage: npx ts-node scripts/init-mongodb.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import { User, Role, Site, SiteUser, Setting, PostType, Taxonomy } from '../lib/models';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI not found in environment variables');
  console.log('Please add MONGODB_URI to your .env file');
  process.exit(1);
}

async function initializeDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data (only for fresh installs)
    const clearData = process.argv.includes('--clear');
    if (clearData) {
      console.log('🗑️  Clearing existing data...');
      await Promise.all([
        User.deleteMany({}),
        Role.deleteMany({}),
        Site.deleteMany({}),
        SiteUser.deleteMany({}),
      ]);
      console.log('✅ Existing data cleared');
    }

    // Check if database is already initialized
    const existingRoles = await Role.countDocuments();
    if (existingRoles > 0 && !clearData) {
      console.log('⚠️  Database already initialized. Use --clear to reset.');
      process.exit(0);
    }

    console.log('📝 Creating default roles...');
    
    // Create default roles
    const superAdminRole = await Role.create({
      name: 'super_admin',
      label: 'Super Administrator',
      permissions: {
        manage_sites: true,
        manage_users: true,
        manage_roles: true,
        manage_settings: true,
        manage_all: true,
      },
    });

    const adminRole = await Role.create({
      name: 'admin',
      label: 'Administrator',
      permissions: {
        manage_posts_all: true,
        manage_pages_all: true,
        manage_media: true,
        manage_taxonomies: true,
        manage_menus: true,
        manage_settings: true,
        manage_users: true,
      },
    });

    const editorRole = await Role.create({
      name: 'editor',
      label: 'Editor',
      permissions: {
        manage_posts_all: true,
        manage_pages_all: true,
        manage_media: true,
        manage_taxonomies: true,
      },
    });

    const authorRole = await Role.create({
      name: 'author',
      label: 'Author',
      permissions: {
        manage_posts_own: true,
        manage_pages_own: true,
        manage_media_own: true,
      },
    });

    const contributorRole = await Role.create({
      name: 'contributor',
      label: 'Contributor',
      permissions: {
        create_posts: true,
        edit_posts_own: true,
      },
    });

    const subscriberRole = await Role.create({
      name: 'subscriber',
      label: 'Subscriber',
      permissions: {
        read: true,
      },
    });

    const guestRole = await Role.create({
      name: 'guest',
      label: 'Guest',
      permissions: {
        read_own: true,
      },
    });

    console.log('✅ Created 7 default roles');

    console.log('🏢 Creating default site...');
    
    // Create default site
    const defaultSite = await Site.create({
      name: 'default',
      display_name: 'Default Site',
      description: 'The default site for Next CMS',
      is_active: true,
    });

    console.log('✅ Created default site');

    console.log('👤 Creating super admin user...');
    
    // Create super admin user (superAdminRole already created above)
    const hashedPassword = await bcrypt.hash('SuperAdmin123!', 10);
    const superAdmin = await User.create({
      username: 'superadmin',
      email: 'admin@example.com',
      password: hashedPassword,
      first_name: 'Super',
      last_name: 'Admin',
      role: superAdminRole._id, // Use the role ObjectId from above
      is_super_admin: true,
      status: 'active',
    });

    console.log('✅ Created super admin user');
    console.log('   Username: superadmin');
    console.log('   Password: SuperAdmin123!');
    console.log('   Email: admin@example.com');

    // Assign super admin to default site
    await SiteUser.create({
      site_id: defaultSite._id,
      user_id: superAdmin._id,
      role_id: superAdminRole._id,
    });

    console.log('✅ Assigned super admin to default site');

    // Create default settings for the site
    console.log('\n📝 Creating default settings...');
    const defaultSettings = [
      { key: 'site_title', value: 'Next CMS', type: 'string', group: 'general', label: 'Site Title' },
      { key: 'site_tagline', value: 'A modern content management system', type: 'string', group: 'general', label: 'Site Tagline' },
      { key: 'session_timeout', value: 30, type: 'number', group: 'authentication', label: 'Session Timeout (minutes)' },
      { key: 'max_upload_size', value: 10, type: 'number', group: 'media', label: 'Max Upload Size (MB)' },
      { key: 'allowed_file_types', value: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'], type: 'json', group: 'media', label: 'Allowed File Types' },
    ];

    for (const setting of defaultSettings) {
      await Setting.create({
        site_id: defaultSite._id,
        ...setting,
      });
    }

    console.log(`✅ Created ${defaultSettings.length} default settings`);

    // Create default post types
    console.log('\n📝 Creating default post types...');
    const defaultPostTypes = [
      {
        name: 'post',
        slug: 'posts',
        labels: {
          singular_name: 'Post',
          plural_name: 'Posts',
          add_new: 'Add New Post',
          edit_item: 'Edit Post',
          view_item: 'View Post',
        },
        description: 'Standard blog posts',
        is_hierarchical: false,
        is_public: true,
        supports: ['title', 'editor', 'thumbnail', 'excerpt', 'comments'],
        menu_icon: '📝',
        menu_position: 5,
        show_in_dashboard: true,
        has_archive: true,
        rewrite_slug: 'blog',
        taxonomies: ['category', 'tag'],
      },
      {
        name: 'page',
        slug: 'pages',
        labels: {
          singular_name: 'Page',
          plural_name: 'Pages',
          add_new: 'Add New Page',
          edit_item: 'Edit Page',
          view_item: 'View Page',
        },
        description: 'Static pages',
        is_hierarchical: true,
        is_public: true,
        supports: ['title', 'editor', 'thumbnail', 'custom_fields'],
        menu_icon: '📄',
        menu_position: 20,
        show_in_dashboard: true,
        has_archive: false,
        taxonomies: [],
      },
    ];

    for (const postType of defaultPostTypes) {
      await PostType.create({
        site_id: defaultSite._id,
        ...postType,
      });
    }

    console.log(`✅ Created ${defaultPostTypes.length} default post types`);

    // Create default taxonomies
    console.log('\n📝 Creating default taxonomies...');
    const defaultTaxonomies = [
      {
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
      },
      {
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
      },
    ];

    for (const taxonomy of defaultTaxonomies) {
      await Taxonomy.create({
        site_id: defaultSite._id,
        ...taxonomy,
      });
    }

    console.log(`✅ Created ${defaultTaxonomies.length} default taxonomies`);

    console.log('\n✨ Database initialization complete!');
    console.log('\n📋 Summary:');
    console.log(`   Roles: ${await Role.countDocuments()}`);
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Sites: ${await Site.countDocuments()}`);
    console.log(`   Site Users: ${await SiteUser.countDocuments()}`);
    console.log(`   Settings: ${await Setting.countDocuments()}`);
    console.log(`   Post Types: ${await PostType.countDocuments()}`);
    console.log(`   Taxonomies: ${await Taxonomy.countDocuments()}`);
    
    console.log('\n🚀 Next steps:');
    console.log('   1. Start the application: npm run dev');
    console.log('   2. Login at http://localhost:3000/admin/login');
    console.log('   3. Use the credentials above');
    console.log('   4. Change the password immediately!');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the initialization
initializeDatabase();

