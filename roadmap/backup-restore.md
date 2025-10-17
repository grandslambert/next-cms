# Backup & Restore

## Overview
Implement a comprehensive backup and restore system that provides reliable, automated backups of all site data (database and media files) with easy restoration capabilities, ensuring data protection and disaster recovery.

## Goals
- Protect against data loss
- Enable point-in-time recovery
- Automate backup processes
- Support multiple storage locations
- Provide quick restoration
- Ensure backup integrity

## Key Features

### Backup Types
- **Full Backup**: Complete site backup (database + media)
- **Database Only**: Just the database content
- **Media Only**: Only uploaded files and images
- **Incremental**: Only changes since last backup
- **Differential**: Changes since last full backup
- **Selective**: Choose specific content types or tables

### Automated Backups
- **Scheduled Backups**: Hourly, daily, weekly, monthly
- **Before Updates**: Automatic backup before major changes
- **On Deployment**: Backup before deployments
- **Smart Scheduling**: During low-traffic periods
- **Retention Policies**: Keep last N backups, age-based deletion
- **Rotation Strategy**: Grandfather-father-son rotation

### Storage Options
- **Local Storage**: Store on server filesystem
- **Cloud Storage**: S3, Google Cloud Storage, Azure Blob
- **FTP/SFTP**: Remote server storage
- **Dropbox**: Personal cloud storage
- **Google Drive**: Google Drive integration
- **Multiple Locations**: Store in multiple places simultaneously

### Restoration Features
- **One-Click Restore**: Simple restoration process
- **Partial Restore**: Restore specific content
- **Point-in-Time Recovery**: Restore to specific date/time
- **Preview Before Restore**: See what will be restored
- **Restore Validation**: Verify backup before restoring
- **Safe Mode Restore**: Test restore without affecting live site
- **Rollback Protection**: Create backup before restoring

### Backup Management
- **Backup Browser**: View and manage all backups
- **Backup Verification**: Test backup integrity
- **Compression**: Reduce backup size (gzip, bzip2)
- **Encryption**: Encrypt backups at rest
- **Backup Comparison**: Compare backup contents
- **Download Backups**: Download to local machine
- **Share Backups**: Generate secure download links

### Monitoring & Alerts
- **Backup Status**: Real-time backup progress
- **Success/Failure Alerts**: Email/webhook notifications
- **Storage Monitoring**: Track storage usage
- **Backup Health Check**: Verify recent backups
- **Missing Backup Alerts**: Alert if backups haven't run
- **Size Anomaly Detection**: Alert on unusual backup sizes

## Database Schema

### Backups Table
```sql
CREATE TABLE site_{id}_backups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  backup_type ENUM('full', 'database', 'media', 'incremental', 'differential', 'selective') DEFAULT 'full',
  trigger_type ENUM('manual', 'scheduled', 'before_update', 'on_demand') DEFAULT 'manual',
  status ENUM('pending', 'running', 'completed', 'failed', 'verifying', 'verified', 'corrupted') DEFAULT 'pending',
  
  -- File information
  file_path VARCHAR(500),
  file_size BIGINT,
  compressed_size BIGINT,
  compression_type VARCHAR(20),
  is_encrypted BOOLEAN DEFAULT false,
  
  -- Storage locations
  storage_locations JSON,
  primary_location VARCHAR(100),
  
  -- Backup content
  includes JSON,
  excludes JSON,
  
  -- Integrity
  checksum_algorithm VARCHAR(20),
  checksum_value VARCHAR(128),
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP NULL,
  
  -- Statistics
  total_files INT,
  total_records INT,
  duration_seconds INT,
  
  -- Metadata
  database_version VARCHAR(50),
  cms_version VARCHAR(20),
  backup_metadata JSON,
  
  -- Retention
  expires_at TIMESTAMP NULL,
  is_protected BOOLEAN DEFAULT false,
  
  -- Tracking
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  
  INDEX idx_status (status),
  INDEX idx_type (backup_type),
  INDEX idx_created (created_at),
  INDEX idx_expires (expires_at)
);
```

### Restore Jobs Table
```sql
CREATE TABLE site_{id}_restore_jobs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  backup_id INT NOT NULL,
  restore_type ENUM('full', 'database', 'media', 'selective') DEFAULT 'full',
  status ENUM('pending', 'preparing', 'running', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  
  -- Restore options
  options JSON,
  selective_items JSON,
  overwrite_existing BOOLEAN DEFAULT true,
  create_backup_before BOOLEAN DEFAULT true,
  pre_restore_backup_id INT,
  
  -- Progress
  progress_current INT DEFAULT 0,
  progress_total INT DEFAULT 0,
  current_step VARCHAR(200),
  
  -- Results
  restored_files INT DEFAULT 0,
  restored_records INT DEFAULT 0,
  errors JSON,
  duration_seconds INT,
  
  -- Tracking
  created_by INT,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (backup_id) REFERENCES site_{id}_backups(id),
  FOREIGN KEY (pre_restore_backup_id) REFERENCES site_{id}_backups(id),
  INDEX idx_status (status)
);
```

### Backup Schedules Table
```sql
CREATE TABLE site_{id}_backup_schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  backup_type ENUM('full', 'database', 'media', 'incremental') DEFAULT 'full',
  frequency ENUM('hourly', 'daily', 'weekly', 'monthly', 'custom') NOT NULL,
  cron_expression VARCHAR(100),
  
  -- Time settings
  hour INT,
  day_of_week INT,
  day_of_month INT,
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Options
  storage_location VARCHAR(100) NOT NULL,
  compression BOOLEAN DEFAULT true,
  encryption BOOLEAN DEFAULT false,
  retention_count INT DEFAULT 7,
  retention_days INT DEFAULT 30,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP NULL,
  last_run_status VARCHAR(50),
  next_run_at TIMESTAMP NULL,
  
  -- Notifications
  notify_on_success BOOLEAN DEFAULT false,
  notify_on_failure BOOLEAN DEFAULT true,
  notification_emails JSON,
  
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_active (is_active),
  INDEX idx_next_run (next_run_at)
);
```

## Implementation Examples

### Backup Service
```typescript
// lib/backup-service.ts
export class BackupService {
  async createBackup(options: BackupOptions): Promise<number> {
    const backup = await this.initializeBackup(options);
    
    try {
      await this.updateBackupStatus(backup.id, 'running');
      
      const startTime = Date.now();
      const tempDir = `/tmp/backup-${backup.id}`;
      await fs.mkdir(tempDir, { recursive: true });
      
      // Backup database
      if (options.includeDatabase) {
        await this.backupDatabase(backup.id, tempDir);
      }
      
      // Backup media
      if (options.includeMedia) {
        await this.backupMedia(backup.id, tempDir);
      }
      
      // Create archive
      const archivePath = await this.createArchive(backup.id, tempDir, {
        compress: options.compress,
        encryption: options.encrypt ? options.encryptionKey : null
      });
      
      // Calculate checksum
      const checksum = await this.calculateChecksum(archivePath);
      
      // Upload to storage locations
      const locations = await this.uploadToStorage(
        backup.id,
        archivePath,
        options.storageLocations
      );
      
      // Update backup record
      const duration = Math.floor((Date.now() - startTime) / 1000);
      const fileSize = (await fs.stat(archivePath)).size;
      
      await db.query(`
        UPDATE backups 
        SET status = ?, 
            file_path = ?,
            file_size = ?,
            checksum_value = ?,
            storage_locations = ?,
            duration_seconds = ?,
            completed_at = NOW()
        WHERE id = ?
      `, [
        'completed',
        archivePath,
        fileSize,
        checksum,
        JSON.stringify(locations),
        duration,
        backup.id
      ]);
      
      // Cleanup temp directory
      await fs.rm(tempDir, { recursive: true, force: true });
      
      // Send notifications
      if (options.notifyOnSuccess) {
        await this.sendNotification(backup.id, 'success');
      }
      
      // Clean old backups
      await this.cleanOldBackups(options.retentionCount, options.retentionDays);
      
      return backup.id;
    } catch (error) {
      await this.updateBackupStatus(backup.id, 'failed', {
        error: error.message
      });
      
      if (options.notifyOnFailure) {
        await this.sendNotification(backup.id, 'failed', error.message);
      }
      
      throw error;
    }
  }
  
  async backupDatabase(backupId: number, outputDir: string): Promise<string> {
    const outputFile = `${outputDir}/database.sql`;
    
    // Use mysqldump
    const command = `mysqldump \
      --host=${process.env.DB_HOST} \
      --user=${process.env.DB_USER} \
      --password=${process.env.DB_PASSWORD} \
      --single-transaction \
      --quick \
      --lock-tables=false \
      ${process.env.DB_NAME} > ${outputFile}`;
    
    await execAsync(command);
    
    return outputFile;
  }
  
  async backupMedia(backupId: number, outputDir: string): Promise<string> {
    const mediaDir = `${outputDir}/media`;
    await fs.mkdir(mediaDir, { recursive: true });
    
    const uploadsDir = `public/uploads/site_${this.siteId}`;
    
    // Copy all media files
    await fs.cp(uploadsDir, mediaDir, { recursive: true });
    
    return mediaDir;
  }
  
  async createArchive(
    backupId: number,
    sourceDir: string,
    options: ArchiveOptions
  ): Promise<string> {
    const archivePath = `backups/backup-${backupId}.tar.gz`;
    
    if (options.compress) {
      // Create compressed archive
      await tar.create(
        {
          gzip: true,
          file: archivePath,
          cwd: sourceDir
        },
        ['.']
      );
    } else {
      // Create uncompressed archive
      await tar.create(
        {
          file: archivePath,
          cwd: sourceDir
        },
        ['.']
      );
    }
    
    // Encrypt if requested
    if (options.encryption) {
      await this.encryptFile(archivePath, options.encryption);
    }
    
    return archivePath;
  }
  
  async calculateChecksum(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
  
  async uploadToStorage(
    backupId: number,
    filePath: string,
    locations: StorageLocation[]
  ): Promise<string[]> {
    const uploaded: string[] = [];
    
    for (const location of locations) {
      try {
        switch (location.type) {
          case 's3':
            await this.uploadToS3(filePath, location);
            break;
          case 'gcs':
            await this.uploadToGCS(filePath, location);
            break;
          case 'ftp':
            await this.uploadToFTP(filePath, location);
            break;
          case 'local':
            await this.copyToLocal(filePath, location);
            break;
        }
        
        uploaded.push(location.type);
      } catch (error) {
        console.error(`Failed to upload to ${location.type}:`, error);
      }
    }
    
    return uploaded;
  }
  
  async verifyBackup(backupId: number): Promise<boolean> {
    const backup = await this.getBackup(backupId);
    
    // Verify checksum
    const currentChecksum = await this.calculateChecksum(backup.file_path);
    if (currentChecksum !== backup.checksum_value) {
      await this.updateBackupStatus(backupId, 'corrupted');
      return false;
    }
    
    // Test extraction
    try {
      const testDir = `/tmp/verify-${backupId}`;
      await this.extractArchive(backup.file_path, testDir);
      
      // Verify database file exists and is valid SQL
      const dbFile = `${testDir}/database.sql`;
      if (backup.backup_type === 'full' || backup.backup_type === 'database') {
        const dbContent = await fs.readFile(dbFile, 'utf-8');
        if (!dbContent.includes('CREATE TABLE')) {
          throw new Error('Invalid database backup');
        }
      }
      
      // Cleanup
      await fs.rm(testDir, { recursive: true, force: true });
      
      // Mark as verified
      await db.query(
        'UPDATE backups SET status = ?, is_verified = true, verified_at = NOW() WHERE id = ?',
        ['verified', backupId]
      );
      
      return true;
    } catch (error) {
      await this.updateBackupStatus(backupId, 'corrupted');
      return false;
    }
  }
}
```

### Restore Service
```typescript
// lib/restore-service.ts
export class RestoreService {
  async restore(backupId: number, options: RestoreOptions): Promise<void> {
    const backup = await this.getBackup(backupId);
    const restoreJob = await this.createRestoreJob(backupId, options);
    
    try {
      await this.updateJobStatus(restoreJob.id, 'preparing');
      
      // Create backup before restore if requested
      if (options.createBackupBefore) {
        const preRestoreBackup = await backupService.createBackup({
          name: `Pre-restore backup ${new Date().toISOString()}`,
          type: 'full',
          storageLocations: ['local']
        });
        
        await db.query(
          'UPDATE restore_jobs SET pre_restore_backup_id = ? WHERE id = ?',
          [preRestoreBackup, restoreJob.id]
        );
      }
      
      // Extract backup
      await this.updateJobStatus(restoreJob.id, 'running', {
        current_step: 'Extracting backup'
      });
      
      const extractDir = `/tmp/restore-${restoreJob.id}`;
      await this.extractBackup(backup.file_path, extractDir);
      
      // Restore database
      if (options.includeDatabase) {
        await this.updateJobStatus(restoreJob.id, 'running', {
          current_step: 'Restoring database'
        });
        
        await this.restoreDatabase(extractDir, options);
      }
      
      // Restore media
      if (options.includeMedia) {
        await this.updateJobStatus(restoreJob.id, 'running', {
          current_step: 'Restoring media files'
        });
        
        await this.restoreMedia(extractDir, options);
      }
      
      // Cleanup
      await fs.rm(extractDir, { recursive: true, force: true });
      
      // Complete
      await this.updateJobStatus(restoreJob.id, 'completed');
      
      // Send notification
      await this.sendNotification(restoreJob.id, 'success');
      
      // Clear caches
      await cache.flush();
      
    } catch (error) {
      await this.updateJobStatus(restoreJob.id, 'failed', {
        error: error.message
      });
      
      await this.sendNotification(restoreJob.id, 'failed', error.message);
      
      throw error;
    }
  }
  
  async restoreDatabase(extractDir: string, options: RestoreOptions): Promise<void> {
    const sqlFile = `${extractDir}/database.sql`;
    
    // Drop existing tables if overwrite is true
    if (options.overwriteExisting) {
      await this.dropAllTables();
    }
    
    // Import SQL file
    const command = `mysql \
      --host=${process.env.DB_HOST} \
      --user=${process.env.DB_USER} \
      --password=${process.env.DB_PASSWORD} \
      ${process.env.DB_NAME} < ${sqlFile}`;
    
    await execAsync(command);
  }
  
  async restoreMedia(extractDir: string, options: RestoreOptions): Promise<void> {
    const mediaSource = `${extractDir}/media`;
    const mediaTarget = `public/uploads/site_${this.siteId}`;
    
    if (options.overwriteExisting) {
      // Remove existing media
      await fs.rm(mediaTarget, { recursive: true, force: true });
    }
    
    // Copy media files
    await fs.mkdir(mediaTarget, { recursive: true });
    await fs.cp(mediaSource, mediaTarget, { recursive: true });
  }
  
  async extractBackup(archivePath: string, targetDir: string): Promise<void> {
    await fs.mkdir(targetDir, { recursive: true });
    
    // Check if encrypted
    const isEncrypted = archivePath.endsWith('.enc');
    let extractPath = archivePath;
    
    if (isEncrypted) {
      // Decrypt first
      extractPath = await this.decryptFile(archivePath);
    }
    
    // Extract archive
    await tar.extract({
      file: extractPath,
      cwd: targetDir
    });
    
    // Cleanup decrypted file
    if (isEncrypted && extractPath !== archivePath) {
      await fs.unlink(extractPath);
    }
  }
}
```

### Backup Scheduler
```typescript
// lib/backup-scheduler.ts
export class BackupScheduler {
  async start() {
    // Check every minute for scheduled backups
    setInterval(async () => {
      await this.processSchedules();
    }, 60000);
  }
  
  async processSchedules() {
    const schedules = await db.query(`
      SELECT * FROM backup_schedules
      WHERE is_active = true
      AND (next_run_at IS NULL OR next_run_at <= NOW())
    `);
    
    for (const schedule of schedules) {
      try {
        // Run backup
        await backupService.createBackup({
          name: `${schedule.name} - ${new Date().toISOString()}`,
          type: schedule.backup_type,
          storageLocations: [schedule.storage_location],
          compress: schedule.compression,
          encrypt: schedule.encryption,
          retentionCount: schedule.retention_count,
          retentionDays: schedule.retention_days,
          notifyOnSuccess: schedule.notify_on_success,
          notifyOnFailure: schedule.notify_on_failure
        });
        
        // Update schedule
        const nextRun = this.calculateNextRun(schedule);
        await db.query(`
          UPDATE backup_schedules
          SET last_run_at = NOW(),
              last_run_status = 'success',
              next_run_at = ?
          WHERE id = ?
        `, [nextRun, schedule.id]);
        
      } catch (error) {
        await db.query(`
          UPDATE backup_schedules
          SET last_run_at = NOW(),
              last_run_status = 'failed'
          WHERE id = ?
        `, [schedule.id]);
      }
    }
  }
  
  calculateNextRun(schedule: BackupSchedule): Date {
    const now = new Date();
    
    switch (schedule.frequency) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000);
      
      case 'daily':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(schedule.hour || 2, 0, 0, 0);
        return tomorrow;
      
      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek;
      
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(schedule.day_of_month || 1);
        return nextMonth;
      
      case 'custom':
        // Use cron expression
        return this.parseCronExpression(schedule.cron_expression);
    }
  }
}
```

### Admin UI Components
```typescript
// components/BackupManager.tsx
export function BackupManager() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [creating, setCreating] = useState(false);
  
  const createBackup = async () => {
    setCreating(true);
    
    try {
      const response = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Manual backup ${new Date().toISOString()}`,
          type: 'full',
          storageLocations: ['local', 's3']
        })
      });
      
      const result = await response.json();
      alert('Backup created successfully!');
      loadBackups();
    } catch (error) {
      alert('Backup failed: ' + error.message);
    } finally {
      setCreating(false);
    }
  };
  
  const restoreBackup = async (backupId: number) => {
    if (!confirm('Are you sure you want to restore this backup? This will overwrite current data.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/backups/${backupId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createBackupBefore: true,
          overwriteExisting: true
        })
      });
      
      alert('Restore completed successfully!');
    } catch (error) {
      alert('Restore failed: ' + error.message);
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1>Backups</h1>
        <button
          onClick={createBackup}
          disabled={creating}
          className="btn-primary"
        >
          {creating ? 'Creating...' : 'Create Backup'}
        </button>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Size</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {backups.map(backup => (
            <tr key={backup.id}>
              <td>{backup.name}</td>
              <td>{backup.backup_type}</td>
              <td>{formatBytes(backup.file_size)}</td>
              <td>
                <span className={`status-${backup.status}`}>
                  {backup.status}
                </span>
              </td>
              <td>{formatDate(backup.created_at)}</td>
              <td>
                <button onClick={() => restoreBackup(backup.id)}>
                  Restore
                </button>
                <button onClick={() => downloadBackup(backup.id)}>
                  Download
                </button>
                <button onClick={() => verifyBackup(backup.id)}>
                  Verify
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Implementation Phases

### Phase 1: Core Backup (2-3 weeks)
- Database backup functionality
- Media backup functionality
- Archive creation and compression
- Local storage

### Phase 2: Cloud Storage (1-2 weeks)
- S3 integration
- Google Cloud Storage
- Azure Blob Storage
- FTP/SFTP support

### Phase 3: Restore System (2 weeks)
- Restore functionality
- Verification system
- Safe mode restore
- Rollback protection

### Phase 4: Automation (1-2 weeks)
- Scheduled backups
- Retention policies
- Automatic cleanup
- Backup rotation

### Phase 5: UI & Monitoring (1-2 weeks)
- Admin interface
- Backup browser
- Progress tracking
- Alerts and notifications

## User Stories

1. **Site Owner**: "I want automatic daily backups so I don't lose my content"
2. **Developer**: "I want to restore a backup from last week to undo changes"
3. **Agency**: "I want backups stored in multiple locations for redundancy"
4. **System Admin**: "I want to verify backup integrity before I need them"

## Success Metrics
- Backup success rate: >99.9%
- Restore success rate: >99%
- Backup completion time: <10 minutes for typical site
- Restore time: <15 minutes for typical site

## Dependencies
- Storage services (S3, GCS, etc.)
- Activity logging (for backup/restore tracking)
- Email templates (for notifications)
- Webhooks (for backup event notifications)

## Risks & Mitigation
- **Risk**: Backup corruption
  - **Mitigation**: Checksums, verification, multiple storage locations
  
- **Risk**: Storage space exhaustion
  - **Mitigation**: Compression, retention policies, monitoring
  
- **Risk**: Long backup/restore times
  - **Mitigation**: Incremental backups, parallel processing, optimization

## Related Features
- Import/Export improvements (data migration)
- Activity logging (backup audit trail)
- Email templates (backup notifications)
- Webhooks (backup event notifications)

