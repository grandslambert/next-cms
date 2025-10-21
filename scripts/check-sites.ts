import { GlobalModels } from '../lib/model-factory';
import { connectToGlobalDB, disconnectDB } from '../lib/mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSites() {
  try {
    console.log('Connecting to global database...');
    await connectToGlobalDB();
    
    const Site = await GlobalModels.Site();
    const sites = await Site.find({});
    
    console.log(`\nFound ${sites.length} site(s) in nextcms_global database:\n`);
    
    sites.forEach((site) => {
      console.log(`  ID: ${site._id}`);
      console.log(`  Name: ${site.name}`);
      console.log(`  Display Name: ${site.display_name}`);
      console.log(`  Domain: ${site.domain || 'N/A'}`);
      console.log(`  Active: ${site.is_active}`);
      console.log('  ---');
    });
    
    if (sites.length === 0) {
      console.log('  ⚠️  No sites found! Run init-mongodb.ts to create default site.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await disconnectDB();
  }
}

checkSites();

