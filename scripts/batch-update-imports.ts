/**
 * Batch Update Import Statements
 * This script updates all API routes to use the new model factory pattern
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const API_DIR = 'app/api';

// Global models that should use GlobalModels
const GLOBAL_MODELS = ['User', 'Site', 'Role', 'SiteUser', 'GlobalSetting', 'UserMeta'];

// Site-specific models that should use SiteModels
const SITE_MODELS = [
  'Setting', 'Post', 'PostMeta', 'PostRevision', 'PostTerm', 'PostType',
  'Taxonomy', 'Term', 'Menu', 'MenuItem', 'MenuItemMeta', 'MenuLocation',
  'Media', 'MediaFolder', 'ActivityLog'
];

function updateFile(filePath: string) {
  console.log(`Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Check if file imports from @/lib/models
  if (!content.includes("from '@/lib/models'") && !content.includes('from "@/lib/models"')) {
    console.log('  ⏭️  Skipping - no model imports');
    return;
  }
  
  // Extract imported models
  const importMatch = content.match(/import\s+{([^}]+)}\s+from\s+['"]@\/lib\/models['"]/);
  if (!importMatch) {
    console.log('  ⏭️  Skipping - cannot parse imports');
    return;
  }
  
  const imports = importMatch[1].split(',').map(i => i.trim().split(/\s+/)[0]);
  
  const globalImports = imports.filter(m => GLOBAL_MODELS.includes(m));
  const siteImports = imports.filter(m => SITE_MODELS.includes(m));
  
  console.log(`  Global models: ${globalImports.join(', ') || 'none'}`);
  console.log(`  Site models: ${siteImports.join(', ') || 'none'}`);
  
  // Build new imports
  const newImports: string[] = [];
  
  if (globalImports.length > 0) {
    newImports.push("import { GlobalModels } from '@/lib/model-factory';");
  }
  
  if (siteImports.length > 0) {
    newImports.push("import { SiteModels } from '@/lib/model-factory';");
    newImports.push("import { getCurrentSiteId } from '@/lib/api-helpers';");
  }
  
  // Remove old import
  content = content.replace(/import\s+{[^}]+}\s+from\s+['"]@\/lib\/models['"];?\n?/, '');
  
  // Remove connectDB import if present
  content = content.replace(/import\s+connectDB\s+from\s+['"]@\/lib\/mongodb['"];?\n?/, '');
  
  // Add new imports after authOptions import (common pattern)
  const authImportMatch = content.match(/(import.*authOptions.*\n)/);
  if (authImportMatch) {
    content = content.replace(
      authImportMatch[0],
      authImportMatch[0] + newImports.join('\n') + '\n'
    );
  } else {
    // Add after first import block
    const firstImport = content.indexOf('import');
    const firstImportEnd = content.indexOf('\n\n', firstImport);
    content = content.slice(0, firstImportEnd) + '\n' + newImports.join('\n') + content.slice(firstImportEnd);
  }
  
  // Remove await connectDB() calls
  content = content.replace(/await\s+connectDB\(\);?\n?\s*/g, '');
  
  // Add model instantiation at the start of each handler
  // This is complex and error-prone, so we'll just do the imports for now
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('  ✅ Updated');
  } else {
    console.log('  ⏭️  No changes');
  }
}

async function main() {
  const files = await glob(`${API_DIR}/**/route.ts`);
  console.log(`Found ${files.length} route files\n`);
  
  for (const file of files) {
    try {
      updateFile(file);
    } catch (error) {
      console.error(`  ❌ Error: ${error}`);
    }
  }
  
  console.log('\n✅ Batch update complete!');
  console.log('\n⚠️  NOTE: You still need to manually add model instantiation in each handler:');
  console.log('  const ModelName = await GlobalModels.ModelName();');
  console.log('  OR');
  console.log('  const siteId = await getCurrentSiteId();');
  console.log('  const ModelName = await SiteModels.ModelName(siteId);');
}

main().catch(console.error);

