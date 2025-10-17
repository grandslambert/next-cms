# Import/Export Improvements

## Overview
Enhance the existing import/export functionality with advanced features for data migration, backup/restore, content syndication, and seamless integration with other platforms.

## Goals
- Simplify migration from other CMSs
- Enable reliable backup and restore
- Support partial imports/exports
- Provide data transformation tools
- Ensure data integrity

## Key Features

### Enhanced Export
- **Selective Export**: Choose specific content types, date ranges, authors
- **Format Options**: JSON, XML, CSV, WordPress WXR, Markdown
- **Media Handling**: Include/exclude media files, optimize sizes
- **Incremental Export**: Export only changes since last export
- **Scheduled Exports**: Automatic daily/weekly exports
- **Export Profiles**: Save export configurations for reuse
- **Compression**: ZIP archives for large exports
- **Cloud Upload**: Direct upload to S3, Dropbox, Google Drive

### Advanced Import
- **Source Detection**: Auto-detect import format
- **Preview Mode**: Preview changes before importing
- **Conflict Resolution**: Merge, skip, or overwrite existing content
- **Mapping Tools**: Map fields between different schemas
- **Transformation Rules**: Apply data transformations during import
- **Validation**: Pre-import data validation
- **Batch Processing**: Handle large imports efficiently
- **Resume Capability**: Resume interrupted imports

### Platform Integrations
- **WordPress**: Import from WordPress export files
- **Ghost**: Import Ghost JSON exports
- **Medium**: Import Medium posts
- **Substack**: Import Substack content
- **Markdown Files**: Import from markdown file collections
- **RSS/Atom**: Import from RSS feeds
- **API Import**: Pull from external APIs
- **Database Direct**: Import from other databases

### Migration Wizard
- **Step-by-Step**: Guided migration process
- **Content Analysis**: Analyze source before import
- **Preview**: See what will be imported
- **URL Mapping**: Generate redirect rules automatically
- **Media Download**: Automatically download external media
- **Progress Tracking**: Real-time import progress
- **Error Reporting**: Detailed error logs
- **Rollback**: Undo imports if needed

### Backup & Restore
- **Full Backup**: Complete site backup (database + media)
- **Partial Backup**: Backup specific content
- **Automated Backups**: Scheduled backups
- **Backup Rotation**: Keep last N backups
- **One-Click Restore**: Easy restoration
- **Point-in-Time Recovery**: Restore to specific date
- **Backup Verification**: Test backup integrity
- **Off-site Storage**: Store backups externally

### Content Syndication
- **Multi-Site Sync**: Sync content between sites
- **Push to Other Sites**: Publish to multiple sites
- **Pull from Sources**: Aggregate from external sources
- **Selective Sync**: Choose what to syndicate
- **Conflict Resolution**: Handle duplicate content
- **Scheduled Sync**: Automatic synchronization

## Database Schema

### Import Jobs Table
```sql
CREATE TABLE site_{id}_import_jobs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200),
  source_type VARCHAR(50),
  source_file VARCHAR(500),
  status ENUM('pending', 'analyzing', 'running', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  options JSON,
  mapping JSON,
  stats JSON,
  progress_current INT DEFAULT 0,
  progress_total INT DEFAULT 0,
  errors JSON,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status)
);
```

### Export Jobs Table
```sql
CREATE TABLE site_{id}_export_jobs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200),
  format VARCHAR(50),
  filters JSON,
  options JSON,
  file_path VARCHAR(500),
  file_size BIGINT,
  status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
  stats JSON,
  error_message TEXT,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status)
);
```

### Backups Table
```sql
CREATE TABLE site_{id}_backups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200),
  type ENUM('full', 'content', 'media', 'database') DEFAULT 'full',
  file_path VARCHAR(500),
  file_size BIGINT,
  compression VARCHAR(20),
  storage_location VARCHAR(100),
  is_automatic BOOLEAN DEFAULT false,
  status ENUM('creating', 'completed', 'failed', 'verifying', 'verified') DEFAULT 'creating',
  verification_hash VARCHAR(64),
  can_restore BOOLEAN DEFAULT true,
  stats JSON,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  INDEX idx_status (status),
  INDEX idx_created (created_at)
);
```

## Implementation Examples

### Export Service
```typescript
// lib/export-service.ts
export class ExportService {
  async exportContent(options: ExportOptions): Promise<string> {
    const job = await this.createExportJob(options);
    
    try {
      // Update status
      await this.updateJobStatus(job.id, 'running');
      
      // Gather content
      const posts = await this.getPosts(options.filters);
      const pages = await this.getPages(options.filters);
      const media = options.includeMedia ? await this.getMedia(options.filters) : [];
      const taxonomies = await this.getTaxonomies(options.filters);
      
      // Build export data
      const exportData = {
        version: '1.0',
        site: await this.getSiteInfo(),
        exported_at: new Date().toISOString(),
        posts,
        pages,
        media,
        taxonomies
      };
      
      // Convert to format
      let content: string;
      switch (options.format) {
        case 'json':
          content = JSON.stringify(exportData, null, 2);
          break;
        case 'xml':
          content = this.convertToXML(exportData);
          break;
        case 'wordpress':
          content = this.convertToWordPressWXR(exportData);
          break;
        case 'markdown':
          return await this.exportToMarkdown(exportData);
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }
      
      // Save to file
      const filename = `export-${Date.now()}.${options.format}`;
      const filepath = `exports/${filename}`;
      
      await fs.writeFile(filepath, content);
      
      // Compress if requested
      if (options.compress) {
        await this.compressExport(filepath);
      }
      
      // Update job
      await this.updateJobStatus(job.id, 'completed', {
        file_path: filepath,
        file_size: Buffer.byteLength(content),
        stats: {
          posts: posts.length,
          pages: pages.length,
          media: media.length
        }
      });
      
      return filepath;
    } catch (error) {
      await this.updateJobStatus(job.id, 'failed', {
        error_message: error.message
      });
      throw error;
    }
  }
  
  async exportToMarkdown(data: ExportData): Promise<string> {
    const dir = `exports/markdown-${Date.now()}`;
    await fs.mkdir(dir, { recursive: true });
    
    // Export each post as markdown file
    for (const post of data.posts) {
      const markdown = this.convertToMarkdown(post);
      const filename = `${post.slug}.md`;
      await fs.writeFile(`${dir}/${filename}`, markdown);
    }
    
    // Zip the directory
    const zipPath = `${dir}.zip`;
    await this.zipDirectory(dir, zipPath);
    
    return zipPath;
  }
  
  convertToMarkdown(post: Post): string {
    let markdown = `---
title: "${post.title}"
date: ${post.published_at}
author: ${post.author.display_name}
categories: ${post.categories.map(c => c.name).join(', ')}
tags: ${post.tags.map(t => t.name).join(', ')}
---

`;
    
    markdown += post.content;
    
    return markdown;
  }
  
  convertToWordPressWXR(data: ExportData): string {
    // WordPress WXR format
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<rss version="2.0" xmlns:wp="http://wordpress.org/export/1.2/">\n';
    xml += '<channel>\n';
    
    // Channel info
    xml += `<title>${escapeXml(data.site.name)}</title>\n`;
    xml += `<link>${escapeXml(data.site.url)}</link>\n`;
    
    // Posts
    for (const post of data.posts) {
      xml += '<item>\n';
      xml += `<title>${escapeXml(post.title)}</title>\n`;
      xml += `<link>${escapeXml(post.url)}</link>\n`;
      xml += `<pubDate>${post.published_at}</pubDate>\n`;
      xml += `<wp:post_type>${post.post_type}</wp:post_type>\n`;
      xml += `<wp:status>${post.status}</wp:status>\n`;
      xml += `<content:encoded><![CDATA[${post.content}]]></content:encoded>\n`;
      
      // Categories
      for (const category of post.categories) {
        xml += `<category domain="category" nicename="${category.slug}">${escapeXml(category.name)}</category>\n`;
      }
      
      // Tags
      for (const tag of post.tags) {
        xml += `<category domain="post_tag" nicename="${tag.slug}">${escapeXml(tag.name)}</category>\n`;
      }
      
      xml += '</item>\n';
    }
    
    xml += '</channel>\n';
    xml += '</rss>';
    
    return xml;
  }
}
```

### Import Service
```typescript
// lib/import-service.ts
export class ImportService {
  async importContent(filepath: string, options: ImportOptions): Promise<void> {
    const job = await this.createImportJob(filepath, options);
    
    try {
      // Update status
      await this.updateJobStatus(job.id, 'analyzing');
      
      // Read and parse file
      const content = await fs.readFile(filepath, 'utf-8');
      const data = await this.parseImportFile(content, options.sourceType);
      
      // Validate
      await this.validateImportData(data);
      
      // Preview mode - don't actually import
      if (options.preview) {
        return await this.generatePreview(data);
      }
      
      // Start import
      await this.updateJobStatus(job.id, 'running', {
        progress_total: this.countItems(data)
      });
      
      // Import content
      await this.importPosts(data.posts, job.id, options);
      await this.importPages(data.pages, job.id, options);
      
      if (options.includeMedia) {
        await this.importMedia(data.media, job.id, options);
      }
      
      await this.importTaxonomies(data.taxonomies, job.id, options);
      
      // Generate redirects
      if (options.createRedirects) {
        await this.generateRedirects(data);
      }
      
      // Complete
      await this.updateJobStatus(job.id, 'completed', {
        progress_current: this.countItems(data)
      });
    } catch (error) {
      await this.updateJobStatus(job.id, 'failed', {
        error_message: error.message
      });
      throw error;
    }
  }
  
  async parseImportFile(content: string, sourceType: string): Promise<ImportData> {
    switch (sourceType) {
      case 'wordpress':
        return this.parseWordPressWXR(content);
      case 'ghost':
        return this.parseGhostJSON(content);
      case 'json':
        return JSON.parse(content);
      case 'markdown':
        return await this.parseMarkdownFiles(content);
      default:
        // Auto-detect
        return this.autoDetectAndParse(content);
    }
  }
  
  async importPosts(posts: any[], jobId: number, options: ImportOptions) {
    for (const postData of posts) {
      try {
        // Check if post exists
        const existing = await this.findExistingPost(postData);
        
        if (existing) {
          switch (options.conflictResolution) {
            case 'skip':
              continue;
            case 'update':
              await this.updatePost(existing.id, postData);
              break;
            case 'duplicate':
              await this.createPost(postData, true);
              break;
          }
        } else {
          await this.createPost(postData);
        }
        
        // Update progress
        await this.incrementProgress(jobId);
      } catch (error) {
        await this.logError(jobId, 'post', postData.title, error.message);
      }
    }
  }
  
  async importMedia(mediaItems: any[], jobId: number, options: ImportOptions) {
    for (const mediaData of mediaItems) {
      try {
        // Download media if URL
        let filepath: string;
        if (mediaData.url && mediaData.url.startsWith('http')) {
          filepath = await this.downloadMedia(mediaData.url);
        } else {
          filepath = mediaData.filepath;
        }
        
        // Upload to Next CMS
        await this.uploadMedia(filepath, mediaData);
        
        await this.incrementProgress(jobId);
      } catch (error) {
        await this.logError(jobId, 'media', mediaData.filename, error.message);
      }
    }
  }
}
```

### Migration Wizard UI
```typescript
// components/MigrationWizard.tsx
export function MigrationWizard() {
  const [step, setStep] = useState(1);
  const [sourceType, setSourceType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [options, setOptions] = useState<ImportOptions>({
    includeMedia: true,
    createRedirects: true,
    conflictResolution: 'skip'
  });
  
  const steps = [
    { number: 1, title: 'Select Source', component: SourceSelection },
    { number: 2, title: 'Upload File', component: FileUpload },
    { number: 3, title: 'Preview & Map', component: PreviewMapping },
    { number: 4, title: 'Import Options', component: ImportOptions },
    { number: 5, title: 'Import', component: ImportProgress }
  ];
  
  return (
    <div className="migration-wizard">
      {/* Progress Steps */}
      <div className="steps">
        {steps.map(s => (
          <div key={s.number} className={step >= s.number ? 'active' : ''}>
            <div className="step-number">{s.number}</div>
            <div className="step-title">{s.title}</div>
          </div>
        ))}
      </div>
      
      {/* Step Content */}
      <div className="step-content">
        {step === 1 && (
          <SourceSelection
            selected={sourceType}
            onSelect={(type) => {
              setSourceType(type);
              setStep(2);
            }}
          />
        )}
        
        {step === 2 && (
          <FileUpload
            onUpload={(file) => {
              setFile(file);
              analyzeFile(file).then(preview => {
                setPreview(preview);
                setStep(3);
              });
            }}
          />
        )}
        
        {step === 3 && preview && (
          <PreviewMapping
            preview={preview}
            onContinue={() => setStep(4)}
          />
        )}
        
        {step === 4 && (
          <ImportOptionsForm
            options={options}
            onChange={setOptions}
            onContinue={() => setStep(5)}
          />
        )}
        
        {step === 5 && (
          <ImportProgress
            file={file!}
            options={options}
          />
        )}
      </div>
    </div>
  );
}
```

## Implementation Phases

### Phase 1: Enhanced Export (1-2 weeks)
- Selective export
- Multiple formats
- Export profiles
- Compression

### Phase 2: Advanced Import (2-3 weeks)
- Source detection
- Preview mode
- Conflict resolution
- Field mapping

### Phase 3: Platform Integrations (2-3 weeks)
- WordPress importer
- Ghost importer
- Markdown importer
- Generic importers

### Phase 4: Migration Wizard (2 weeks)
- Step-by-step UI
- Content analysis
- URL mapping
- Progress tracking

### Phase 5: Backup & Restore (1-2 weeks)
- Automated backups
- One-click restore
- Backup verification
- Cloud storage

## User Stories

1. **Site Owner**: "I want to migrate from WordPress without losing content"
2. **Developer**: "I want automated daily backups to S3"
3. **Content Manager**: "I want to export specific posts to share with others"
4. **Agency**: "I want to migrate client sites quickly and reliably"

## Success Metrics
- Import success rate: >95%
- Migration time: <1 hour for 1000 posts
- Data integrity: 100%
- Zero data loss in exports

## Dependencies
- Media system (for media import/export)
- Advanced caching (clear cache after import)
- Activity logging (track import/export actions)

## Risks & Mitigation
- **Risk**: Data loss during import
  - **Mitigation**: Preview mode, validation, backups before import
  
- **Risk**: Memory issues with large imports
  - **Mitigation**: Batch processing, streaming, temporary storage
  
- **Risk**: Incompatible data formats
  - **Mitigation**: Flexible parsing, transformation rules, manual mapping

## Related Features
- Advanced SEO tools (import SEO metadata)
- Multi-language support (import translations)
- Webhooks (notify on import completion)

