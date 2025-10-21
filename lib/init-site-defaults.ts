import mongoose from 'mongoose';
import { SiteModels } from './model-factory';

/**
 * Initialize default data for a newly created site
 * @param siteId - Numeric site ID (maps to database nextcms_site{siteId})
 * @param userId - Optional user ID to set as the author of default content
 */
export async function initializeSiteDefaults(siteId: number, userId?: string) {
  console.log(`\n📦 Initializing defaults for site ${siteId} (database: nextcms_site${siteId})...`);

  // Get models for this site's database
  const PostType = await SiteModels.PostType(siteId);
  const Taxonomy = await SiteModels.Taxonomy(siteId);
  const Setting = await SiteModels.Setting(siteId);
  const Term = await SiteModels.Term(siteId);
  const Post = await SiteModels.Post(siteId);
  const PostMeta = await SiteModels.PostMeta(siteId);
  const PostRevision = await SiteModels.PostRevision(siteId);
  const PostTerm = await SiteModels.PostTerm(siteId);
  const Menu = await SiteModels.Menu(siteId);
  const MenuItem = await SiteModels.MenuItem(siteId);
  const MenuItemMeta = await SiteModels.MenuItemMeta(siteId);
  const MenuLocation = await SiteModels.MenuLocation(siteId);
  const Media = await SiteModels.Media(siteId);
  const MediaFolder = await SiteModels.MediaFolder(siteId);
  const ActivityLog = await SiteModels.ActivityLog(siteId);

  // Create default post types
  console.log('  📝 Creating default post types...');
  
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

  console.log('  ✓ Created 2 default post types');

  // Create default taxonomies
  console.log('  🏷️  Creating default taxonomies...');

  await Taxonomy.create({
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

  await Taxonomy.create({
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

  console.log('  ✓ Created 2 default taxonomies');

  // Create default site settings
  console.log('  ⚙️  Creating default site settings...');

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

  console.log(`  ✓ Created ${defaultSettings.length} default settings`);

  // Create default term (Uncategorized category)
  console.log('  🏷️  Creating default term...');
  
  await Term.create({
    taxonomy: 'category',
    name: 'Uncategorized',
    slug: 'uncategorized',
    description: 'Default category for posts without a category',
  });

  console.log('  ✓ Created default "Uncategorized" category');

  // Create default menu locations
  console.log('  📍 Creating default menu locations...');
  
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

  console.log('  ✓ Created 2 menu locations');

  // Create sample media folder
  console.log('  📁 Creating sample media folder...');
  
  await MediaFolder.create({
    name: 'Images',
    parent_id: null,
  });

  console.log('  ✓ Created sample media folder');

  // Initialize empty collections (MongoDB only creates collections when data is inserted)
  console.log('  📦 Ensuring all collections exist...');
  
  // Create indexes for collections that don't have data yet (this creates the collection)
  await PostMeta.createIndexes();
  await PostRevision.createIndexes();
  await PostTerm.createIndexes();
  await MenuItemMeta.createIndexes();
  await Media.createIndexes();
  await ActivityLog.createIndexes();
  
  console.log('  ✓ All 15 collections initialized');

  // Create sample pages and posts (if userId provided)
  if (userId) {
    console.log('  📄 Creating sample pages...');
    
    const authorId = new mongoose.Types.ObjectId(userId);
    
    const homePage = await Post.create({
      post_type: 'page',
      title: 'Home',
      slug: 'home',
      content: '<h1>Welcome to Next CMS</h1><p>This is your homepage. Edit it to customize your site!</p>',
      excerpt: 'Welcome to your new CMS',
      status: 'published',
      visibility: 'public',
      author_id: authorId,
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
      author_id: authorId,
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
      author_id: authorId,
      published_at: new Date(),
    });

    console.log('  ✓ Created 3 sample pages');

    console.log('  📝 Creating sample blog post...');
    
    await Post.create({
      post_type: 'post',
      title: 'Hello World!',
      slug: 'hello-world',
      content: '<h2>Welcome to Next CMS</h2><p>This is your first blog post. You can edit or delete it to get started with your content!</p><p><strong>Features:</strong></p><ul><li>Powerful content management</li><li>Multi-site support</li><li>Flexible taxonomies</li><li>Media management</li><li>And much more!</li></ul>',
      excerpt: 'Welcome to your new CMS! This is your first blog post.',
      status: 'published',
      visibility: 'public',
      author_id: authorId,
      published_at: new Date(),
      allow_comments: true,
    });

    console.log('  ✓ Created sample blog post');

    // Create default menus
    console.log('  📋 Creating default menus...');
    
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

    console.log('  ✓ Created 2 menus');

    // Create menu items
    console.log('  🔗 Creating menu items...');
    
    await MenuItem.create({
      menu_id: mainMenu._id,
      custom_label: 'Home',
      type: 'post',
      object_id: homePage._id,
      custom_url: '/',
      menu_order: 1,
      target: '_self',
    });

    await MenuItem.create({
      menu_id: mainMenu._id,
      custom_label: 'About',
      type: 'post',
      object_id: aboutPage._id,
      custom_url: '/about',
      menu_order: 2,
      target: '_self',
    });

    await MenuItem.create({
      menu_id: mainMenu._id,
      custom_label: 'Blog',
      type: 'custom',
      custom_url: '/blog',
      menu_order: 3,
      target: '_self',
    });

    await MenuItem.create({
      menu_id: mainMenu._id,
      custom_label: 'Contact',
      type: 'post',
      object_id: contactPage._id,
      custom_url: '/contact',
      menu_order: 4,
      target: '_self',
    });

    await MenuItem.create({
      menu_id: footerMenu._id,
      custom_label: 'Privacy Policy',
      type: 'custom',
      custom_url: '/privacy',
      menu_order: 1,
      target: '_self',
    });

    await MenuItem.create({
      menu_id: footerMenu._id,
      custom_label: 'Terms of Service',
      type: 'custom',
      custom_url: '/terms',
      menu_order: 2,
      target: '_self',
    });

    console.log('  ✓ Created 6 menu items');
  }

  console.log(`✅ Site initialization complete!\n`);

  return {
    postTypes: [postPostType, pagePostType],
    success: true,
  };
}

