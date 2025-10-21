/**
 * Migration Script: Add post_type field to menu items
 * Updates all menu items with type='post' to include the post_type field
 * 
 * Usage: npx ts-node --project tsconfig.node.json scripts/migrate-menu-items-post-type.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { GlobalModels, SiteModels } from '../lib/model-factory';
import { connectToGlobalDB, connectToSiteDB, disconnectDB } from '../lib/mongodb';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function migrateMenuItems() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Connect to global database
    await connectToGlobalDB();
    console.log('✅ Connected to global database');
    
    // Get all sites
    const Site = await GlobalModels.Site();
    const sites = await Site.find({}).lean();
    
    console.log(`\n📊 Found ${sites.length} site(s) to migrate\n`);
    
    for (const site of sites as any[]) {
      const siteId = site.id;
      console.log(`\n🔄 Migrating site ${siteId} (${site.display_name})...`);
      
      // Connect to site database
      await connectToSiteDB(siteId);
      
      const MenuItem = await SiteModels.MenuItem(siteId);
      const Post = await SiteModels.Post(siteId);
      
      // Find all menu items with type='post' and no post_type field
      const menuItems = await MenuItem.find({
        type: 'post',
        $or: [
          { post_type: { $exists: false } },
          { post_type: null },
          { post_type: '' }
        ]
      }).lean();
      
      console.log(`  Found ${menuItems.length} menu items to update`);
      
      if (menuItems.length === 0) {
        console.log('  ✓ No menu items need updating');
        continue;
      }
      
      let updated = 0;
      let skipped = 0;
      
      for (const item of menuItems as any[]) {
        if (!item.object_id) {
          console.log(`  ⚠️  Skipping menu item ${item._id} - no object_id`);
          skipped++;
          continue;
        }
        
        // Look up the post/page to get its post_type
        const post = await Post.findById(item.object_id).lean();
        
        if (!post) {
          console.log(`  ⚠️  Skipping menu item ${item._id} - post ${item.object_id} not found`);
          skipped++;
          continue;
        }
        
        const postType = (post as any).post_type;
        
        // Update the menu item with the post_type
        await MenuItem.updateOne(
          { _id: item._id },
          { $set: { post_type: postType } }
        );
        
        console.log(`  ✓ Updated menu item "${item.custom_label}" to post_type="${postType}"`);
        updated++;
      }
      
      console.log(`  ✅ Updated ${updated} menu items, skipped ${skipped}`);
    }
    
    console.log('\n✨ Migration complete!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the migration
migrateMenuItems();

