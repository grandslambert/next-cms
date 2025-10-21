/**
 * MongoDB Database Initialization Script
 * Creates initial collections, indexes, and seed data in separate databases:
 * - nextcms_global: Users, Roles, Sites, SiteUsers, GlobalSettings, UserMeta
 * - nextcms_site1: Site-specific content (Posts, Media, Settings, etc.)
 * 
 * Usage: 
 *   npx ts-node --project tsconfig.node.json scripts/init-mongodb.ts
 *   npx ts-node --project tsconfig.node.json scripts/init-mongodb.ts --clear
 */

import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import model factories
import { GlobalModels, SiteModels } from '../lib/model-factory';
import { connectToGlobalDB, connectToSiteDB, disconnectDB } from '../lib/mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI not found in environment variables');
  console.log('Please add MONGODB_URI to your .env file');
  process.exit(1);
}

async function initializeDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB databases...');
    
    // Connect to global database
    await connectToGlobalDB();
    console.log('✅ Connected to nextcms_global database');
    
    // Connect to site 1 database
    await connectToSiteDB(1);
    console.log('✅ Connected to nextcms_site1 database');

    // Get model instances
    const User = await GlobalModels.User();
    const Role = await GlobalModels.Role();
    const Site = await GlobalModels.Site();
    const SiteUser = await GlobalModels.SiteUser();
    const GlobalSetting = await GlobalModels.GlobalSetting();
    const UserMeta = await GlobalModels.UserMeta();
    const GlobalActivityLog = await GlobalModels.ActivityLog();

    // Clear existing data (only for fresh installs)
    const clearData = process.argv.includes('--clear');
    if (clearData) {
      console.log('🗑️  Clearing existing data from all databases...');
      
      // Clear global database
      await Promise.all([
        User.deleteMany({}),
        Role.deleteMany({}),
        Site.deleteMany({}),
        SiteUser.deleteMany({}),
        GlobalSetting.deleteMany({}),
        UserMeta.deleteMany({}),
        GlobalActivityLog.deleteMany({}),
      ]);
      console.log('✅ Global database cleared');
      
      // Clear site 1 database
      await Promise.all([
        (await SiteModels.Setting(1)).deleteMany({}),
        (await SiteModels.PostType(1)).deleteMany({}),
        (await SiteModels.Taxonomy(1)).deleteMany({}),
        (await SiteModels.Term(1)).deleteMany({}),
        (await SiteModels.Post(1)).deleteMany({}),
        (await SiteModels.Menu(1)).deleteMany({}),
        (await SiteModels.MenuItem(1)).deleteMany({}),
        (await SiteModels.MenuLocation(1)).deleteMany({}),
        (await SiteModels.Media(1)).deleteMany({}),
        (await SiteModels.MediaFolder(1)).deleteMany({}),
        (await SiteModels.ActivityLog(1)).deleteMany({}),
        (await SiteModels.PostMeta(1)).deleteMany({}),
        (await SiteModels.PostRevision(1)).deleteMany({}),
        (await SiteModels.PostTerm(1)).deleteMany({}),
        (await SiteModels.MenuItemMeta(1)).deleteMany({}),
      ]);
      console.log('✅ Site 1 database cleared');
    }

    // Check if database is already initialized
    const existingRoles = await Role.countDocuments();
    if (existingRoles > 0 && !clearData) {
      console.log('⚠️  Database already initialized. Use --clear to reset.');
      process.exit(0);
    }

    console.log('\n📝 Creating default roles...');
    
    // Create default roles
    const superAdminRole = await Role.create({
      name: 'super_admin',
      label: 'Super Administrator',
      display_name: 'Super Administrator',
      description: 'Full system access including multi-site management',
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
      display_name: 'Administrator',
      description: 'Full site access and management',
      permissions: {
        view_dashboard: true,
        manage_posts_all: true,
        manage_post_types: true,
        manage_media: true,
        manage_taxonomies: true,
        manage_menus: true,
        manage_settings: true,
        manage_users: true,
        can_publish: true,
        can_delete: true,
        can_delete_others: true,
        manage_others_posts: true,
        view_others_posts: true,
      },
    });

    const editorRole = await Role.create({
      name: 'editor',
      label: 'Editor',
      display_name: 'Editor',
      description: 'Can publish and manage posts including posts of other users',
      permissions: {
        view_dashboard: true,
        manage_posts_all: true,
        manage_media: true,
        manage_taxonomies: true,
        edit_published_posts: true,
        delete_published_posts: true,
        can_publish: true,
        can_delete: true,
        can_delete_others: true,
        manage_others_posts: true,
        view_others_posts: true,
      },
    });

    const authorRole = await Role.create({
      name: 'author',
      label: 'Author',
      display_name: 'Author',
      description: 'Can publish and manage their own posts',
      permissions: {
        view_dashboard: true,
        manage_posts_all: true,
        manage_media_own: true,
        publish_posts: true,
        upload_files: true,
        can_publish: true,
        can_delete: true,
      },
    });

    const contributorRole = await Role.create({
      name: 'contributor',
      label: 'Contributor',
      display_name: 'Contributor',
      description: 'Can write and manage their own posts but cannot publish',
      permissions: {
        view_dashboard: true,
        create_posts: true,
        edit_posts_own: true,
        delete_posts_own: true,
        manage_posts_post: true,
        manage_posts_page: true,
        can_delete: true,
      },
    });

    const subscriberRole = await Role.create({
      name: 'subscriber',
      label: 'Subscriber',
      display_name: 'Subscriber',
      description: 'Can read content and manage their profile',
      permissions: {
        read: true,
      },
    });

    const guestRole = await Role.create({
      name: 'guest',
      label: 'Guest',
      display_name: 'Guest',
      description: 'Limited access to read content',
      permissions: {
        read_own: true,
      },
    });

    console.log('✅ Created 7 default roles');

    console.log('\n🏢 Creating default site...');
    
    // Create default site with explicit ID
    // The ID determines the database name: nextcms_site{id}
    const defaultSite = await Site.create({
      id: 1, // This maps to database: nextcms_site1
      name: 'default',
      display_name: 'Default Site',
      description: 'The default site for Next CMS',
      domain: 'localhost:3000',
      is_active: true,
    });

    console.log(`✅ Created default site (ID: ${defaultSite.id}, Database: nextcms_site${defaultSite.id})`);

    console.log('\n👤 Creating super admin user...');
    
    // Create super admin user
    const hashedPassword = await bcrypt.hash('SuperAdmin123!', 10);
    const superAdmin = await User.create({
      username: 'superadmin',
      email: 'admin@example.com',
      password: hashedPassword,
      first_name: 'Super',
      last_name: 'Admin',
      role: superAdminRole._id,
      is_super_admin: true,
      status: 'active',
    });

    console.log('✅ Created super admin user');
    console.log('   Username: superadmin');
    console.log('   Password: SuperAdmin123!');
    console.log('   Email: admin@example.com');
    console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!');

    console.log('\n👤 Creating default site administrator...');
    
    // Create default site admin user
    const hashedAdminPassword = await bcrypt.hash('Admin123!', 10);
    const siteAdmin = await User.create({
      username: 'admin',
      email: 'siteadmin@example.com',
      password: hashedAdminPassword,
      first_name: 'Site',
      last_name: 'Administrator',
      role: adminRole._id,
      is_super_admin: false,
      status: 'active',
    });

    console.log('✅ Created site administrator user');
    console.log('   Username: admin');
    console.log('   Password: Admin123!');
    console.log('   Email: siteadmin@example.com');
    console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!');

    // Assign site admin to default site (NOT the super admin)
    await SiteUser.create({
      site_id: defaultSite.id,
      user_id: siteAdmin._id,
      role_id: adminRole._id,
    });

    console.log('✅ Assigned site administrator to default site');

    // Create global settings
    console.log('\n⚙️  Creating global settings...');
    const globalSettings = [
      { key: 'auth_hide_default_user', value: false, type: 'boolean', description: 'Hide default user from login screen' },
    ];

    for (const setting of globalSettings) {
      await GlobalSetting.create(setting);
    }

    console.log(`✅ Created ${globalSettings.length} global settings`);

    // Get site-specific models for site 1
    const Setting = await SiteModels.Setting(1);
    const PostType = await SiteModels.PostType(1);
    const Taxonomy = await SiteModels.Taxonomy(1);
    const Term = await SiteModels.Term(1);
    const Post = await SiteModels.Post(1);
    const Menu = await SiteModels.Menu(1);
    const MenuItem = await SiteModels.MenuItem(1);
    const MenuLocation = await SiteModels.MenuLocation(1);
    const MediaFolder = await SiteModels.MediaFolder(1);

    // Create default site settings
    console.log('\n📝 Creating default site settings...');
    const defaultSettings = [
      { key: 'site_title', value: 'Next CMS', type: 'string', group: 'general', label: 'Site Title', description: 'The name of your website' },
      { key: 'site_tagline', value: 'A modern content management system', type: 'string', group: 'general', label: 'Site Tagline', description: 'A short description of your site' },
      { key: 'site_description', value: 'A powerful CMS built with Next.js and MongoDB', type: 'text', group: 'general', label: 'Site Description' },
      { key: 'posts_per_page', value: 10, type: 'number', group: 'general', label: 'Posts Per Page', description: 'Number of posts to show per page' },
      { key: 'max_revisions', value: 10, type: 'number', group: 'general', label: 'Maximum Revisions Per Post', description: 'Number of revisions to keep for each post' },
      { key: 'session_timeout', value: 1440, type: 'number', group: 'authentication', label: 'Session Timeout (minutes)', description: 'How long users stay logged in (default: 24 hours)' },
      { key: 'max_upload_size', value: 10, type: 'number', group: 'media', label: 'Max Upload Size (MB)', description: 'Maximum file upload size' },
      { key: 'allowed_file_types', value: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'], type: 'json', group: 'media', label: 'Allowed File Types' },
      { key: 'image_sizes', value: { thumbnail: { width: 150, height: 150, crop: 'cover' }, medium: { width: 300, height: 300, crop: 'inside' }, large: { width: 1024, height: 1024, crop: 'inside' } }, type: 'json', group: 'media', label: 'Image Sizes', description: 'Automatic image size generation settings' },
    ];

    for (const setting of defaultSettings) {
      await Setting.create({
        ...setting,
      });
    }

    console.log(`✅ Created ${defaultSettings.length} site settings`);

    // Create default post types
    console.log('\n📝 Creating default post types...');
    const postPostType = await PostType.create({
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
      menu_position: 1,
      show_in_dashboard: true,
      show_in_menu: true,
      has_archive: true,
      rewrite_slug: 'blog',
      taxonomies: ['category', 'tag'],
    });

    const pagePostType = await PostType.create({
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
      menu_position: 2,
      show_in_dashboard: true,
      show_in_menu: true,
      has_archive: false,
      taxonomies: [],
    });

    console.log('✅ Created 2 default post types');

    // Create default taxonomies
    console.log('\n📝 Creating default taxonomies...');
    const categoryTaxonomy = await Taxonomy.create({
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
      show_in_menu: true,
      menu_position: 1,
      post_types: ['post'],
      rewrite_slug: 'category',
    });

    const tagTaxonomy = await Taxonomy.create({
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
      show_in_menu: true,
      menu_position: 2,
      post_types: ['post'],
      rewrite_slug: 'tag',
    });

    console.log('✅ Created 2 default taxonomies');

    // Create default terms
    console.log('\n📝 Creating default terms...');
    const uncategorizedTerm = await Term.create({
      taxonomy: 'category',
      name: 'Uncategorized',
      slug: 'uncategorized',
      description: 'Default category for posts without a category',
    });

    console.log('✅ Created default "Uncategorized" category');

    // Create default pages
    console.log('\n📝 Creating default pages...');
    
    const homePage = await Post.create({
      post_type: 'page',
      title: 'Home',
      slug: 'home',
      content: '<h1>Welcome to Next CMS</h1><p>This is your homepage. Edit it to customize your site!</p>',
      excerpt: 'Welcome to your new CMS',
      status: 'published',
      visibility: 'public',
      author_id: siteAdmin._id,
      published_at: new Date(),
    });

    const aboutPage = await Post.create({
      post_type: 'page',
      title: 'About',
      slug: 'about',
      content: '<h1>About Us</h1><p>Tell your visitors about your site and organization.</p>',
      excerpt: 'Learn more about us',
      status: 'published',
      visibility: 'public',
      author_id: siteAdmin._id,
      published_at: new Date(),
    });

    const contactPage = await Post.create({
      post_type: 'page',
      title: 'Contact',
      slug: 'contact',
      content: '<h1>Contact Us</h1><p>Get in touch with us!</p>',
      excerpt: 'Contact information',
      status: 'published',
      visibility: 'public',
      author_id: siteAdmin._id,
      published_at: new Date(),
    });

    console.log('✅ Created 3 default pages (Home, About, Contact)');

    // Create a sample blog post
    console.log('\n📝 Creating sample blog post...');
    
    const helloWorldPost = await Post.create({
      post_type: 'post',
      title: 'Hello World!',
      slug: 'hello-world',
      content: '<h2>Welcome to Next CMS</h2><p>This is your first blog post. You can edit or delete it to get started with your content!</p><p><strong>Features:</strong></p><ul><li>Powerful content management</li><li>Multi-site support</li><li>Flexible taxonomies</li><li>Media management</li><li>And much more!</li></ul>',
      excerpt: 'Welcome to your new CMS! This is your first blog post.',
      status: 'published',
      visibility: 'public',
      author_id: siteAdmin._id,
      published_at: new Date(),
      allow_comments: true,
    });

    console.log('✅ Created sample "Hello World" post');

    // Create default menus
    console.log('\n📝 Creating default menus...');
    
    const mainMenu = await Menu.create({
      name: 'main-menu',
      display_name: 'Main Menu',
      location: 'header',
    });

    const footerMenu = await Menu.create({
      name: 'footer-menu',
      display_name: 'Footer Menu',
      location: 'footer',
    });

    console.log('✅ Created 2 default menus');

    // Create menu items for main menu
    console.log('\n📝 Creating menu items...');
    
    const homeMenuItem = await MenuItem.create({
      menu_id: mainMenu._id,
      custom_label: 'Home',
      type: 'post',
      object_id: homePage._id,
      custom_url: '/',
      menu_order: 1,
      target: '_self',
    });

    const aboutMenuItem = await MenuItem.create({
      menu_id: mainMenu._id,
      custom_label: 'About',
      type: 'post',
      object_id: aboutPage._id,
      custom_url: '/about',
      menu_order: 2,
      target: '_self',
    });

    const blogMenuItem = await MenuItem.create({
      menu_id: mainMenu._id,
      custom_label: 'Blog',
      type: 'custom',
      custom_url: '/blog',
      menu_order: 3,
      target: '_self',
    });

    const contactMenuItem = await MenuItem.create({
      menu_id: mainMenu._id,
      custom_label: 'Contact',
      type: 'post',
      object_id: contactPage._id,
      custom_url: '/contact',
      menu_order: 4,
      target: '_self',
    });

    // Footer menu items
    const privacyMenuItem = await MenuItem.create({
      menu_id: footerMenu._id,
      custom_label: 'Privacy Policy',
      type: 'custom',
      custom_url: '/privacy',
      menu_order: 1,
      target: '_self',
    });

    const termsMenuItem = await MenuItem.create({
      menu_id: footerMenu._id,
      custom_label: 'Terms of Service',
      type: 'custom',
      custom_url: '/terms',
      menu_order: 2,
      target: '_self',
    });

    console.log('✅ Created 6 menu items');

    // Create menu locations (theme location definitions)
    console.log('\n📝 Creating menu locations...');
    
    await MenuLocation.create({
      name: 'header',
      display_name: 'Header Menu',
      description: 'Primary header navigation',
    });

    await MenuLocation.create({
      name: 'footer',
      display_name: 'Footer Menu',
      description: 'Footer navigation',
    });

    console.log('✅ Created 2 menu locations');

    // Create sample user meta (user preferences)
    console.log('\n📝 Creating sample user meta...');
    
    await UserMeta.create({
      user_id: siteAdmin._id,
      site_id: defaultSite.id,
      meta_key: 'dashboard_layout',
      meta_value: 'grid',
    });

    await UserMeta.create({
      user_id: siteAdmin._id,
      site_id: defaultSite.id,
      meta_key: 'items_per_page',
      meta_value: '25',
    });

    console.log('✅ Created sample user meta');

    // Create sample media folder
    console.log('\n📝 Creating sample media folder...');
    
    const imagesFolder = await MediaFolder.create({
      name: 'Images',
      parent_id: null,
    });

    console.log('✅ Created sample media folder');

    // Get activity log model for count
    const ActivityLog = await SiteModels.ActivityLog(1);

    // Summary
    console.log('\n✨ Database initialization complete!');
    console.log('\n📋 Summary:');
    console.log('\n  Global Database (nextcms_global):');
    console.log(`    Roles: ${await Role.countDocuments()}`);
    console.log(`    Users: ${await User.countDocuments()}`);
    console.log(`    Sites: ${await Site.countDocuments()}`);
    console.log(`    Site Users: ${await SiteUser.countDocuments()}`);
    console.log(`    Global Settings: ${await GlobalSetting.countDocuments()}`);
    console.log(`    User Meta: ${await UserMeta.countDocuments()}`);
    console.log(`    Activity Log (Global): ${await GlobalActivityLog.countDocuments()} (empty on init)`);
    console.log('\n  Site 1 Database (nextcms_site1):');
    console.log(`    Site Settings: ${await Setting.countDocuments()}`);
    console.log(`    Activity Log: ${await ActivityLog.countDocuments()} (empty on init)`);
    console.log(`    Post Types: ${await PostType.countDocuments()}`);
    console.log(`    Taxonomies: ${await Taxonomy.countDocuments()}`);
    console.log(`    Terms: ${await Term.countDocuments()}`);
    console.log(`    Posts/Pages: ${await Post.countDocuments()}`);
    console.log(`    Menus: ${await Menu.countDocuments()}`);
    console.log(`    Menu Items: ${await MenuItem.countDocuments()}`);
    console.log(`    Menu Locations: ${await MenuLocation.countDocuments()}`);
    console.log(`    Media Folders: ${await MediaFolder.countDocuments()}`);
    
    console.log('\n🎉 Your Next CMS installation is ready!');
    console.log('\n🚀 Next steps:');
    console.log('   1. Start the application: npm run dev');
    console.log('   2. Login at http://localhost:3000/admin/login');
    console.log('');
    console.log('   👑 Super Admin Access (for site management):');
    console.log('      Username: superadmin');
    console.log('      Password: SuperAdmin123!');
    console.log('');
    console.log('   👤 Site Admin Access (for content management):');
    console.log('      Username: admin');
    console.log('      Password: Admin123!');
    console.log('');
    console.log('   ⚠️  CHANGE BOTH PASSWORDS IMMEDIATELY!');
    console.log('\n📚 Check out these pages:');
    console.log('   • Home: http://localhost:3000');
    console.log('   • About: http://localhost:3000/about');
    console.log('   • Blog: http://localhost:3000/blog');
    console.log('   • Contact: http://localhost:3000/contact');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
    console.log('\n🔌 Disconnected from all MongoDB databases');
  }
}

// Run the initialization
initializeDatabase();
