## ADDED Requirements

### Requirement: SQLite database is backed up daily
The system SHALL create a backup of the SQLite database every day at 2:00 AM server time.

#### Scenario: Scheduled backup
- **WHEN** the cron job triggers at 2:00 AM
- **THEN** the backup script copies `.data/db.sqlite` to `/var/backups/snapense/db_YYYYMMDD_HHMMSS.sqlite`
- **AND** the backup file has restricted permissions (640)
- **AND** a log entry is written to `/var/log/snapense-backup.log`

#### Scenario: Backup when database exists
- **WHEN** the backup script runs and `.data/db.sqlite` exists
- **THEN** a timestamped backup is created successfully

#### Scenario: Backup when database is missing
- **WHEN** the backup script runs and `.data/db.sqlite` does not exist
- **THEN** the script logs an error and exits with code 1
- **AND** no empty backup file is created

---

### Requirement: Old backups are automatically purged
The system SHALL retain only the most recent 7 days of database backups.

#### Scenario: Purging old backups
- **WHEN** the backup script completes successfully
- **THEN** it deletes all backup files in `/var/backups/snapense/` older than 7 days
- **AND** the purge operation is logged

#### Scenario: No old backups to purge
- **WHEN** the backup script runs and all backups are within 7 days
- **THEN** no files are deleted
- **AND** the script completes successfully

---

### Requirement: Backups can be restored manually
The system SHALL allow an administrator to restore the database from any backup file.

#### Scenario: Manual restore
- **WHEN** an administrator copies a backup file to `.data/db.sqlite`
- **THEN** the application uses the restored database on the next container restart
- **AND** the restored database is accessible to the application user inside the container
