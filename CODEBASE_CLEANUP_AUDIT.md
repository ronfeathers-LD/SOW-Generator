# Codebase Cleanup Audit Report

## Executive Summary

After conducting a comprehensive audit of the SOW Generator codebase, I've identified significant opportunities for cleanup and organization. The project has accumulated many temporary files, redundant migrations, and test artifacts that can be safely removed.

## Files Analysis

### 📊 Current State
- **32 SQL files** in root directory
- **13 Markdown files** in root directory  
- **10+ test API routes** in src/app/api
- **Multiple redundant migration files**
- **Temporary documentation files**

## 🗑️ Files Safe to Delete

### 1. Temporary Documentation Files (7 files)
These were created during development and are no longer needed:

```
PM_HOURS_REMOVAL_IMPLEMENTATION_COMPLETE.md
PM_HOURS_REMOVAL_DEPLOYMENT_COMPLETE.md
LOCAL_PM_HOURS_REMOVAL_SETUP_COMPLETE.md
PRODUCTION_FOREIGN_KEY_FIX.md
PRODUCTION_MIGRATION_INSTRUCTIONS.md
FUNCTIONALITY_AUDIT.md
DASHBOARD_FIX_README.md
```

### 2. Redundant SQL Migration Files (15+ files)
Many of these are duplicates or have been superseded:

#### PM Hours Removal (4 files - keep only 1)
```
add-pm-hours-removal-comments-columns.sql     # ❌ DELETE - redundant
add-pm-hours-removal-requests-columns.sql     # ❌ DELETE - redundant  
add-pm-hours-removal-sow-columns.sql          # ❌ DELETE - redundant
add-pm-hours-removal-system.sql               # ❌ DELETE - superseded
fix-pm-hours-removal-schema.sql               # ❌ DELETE - superseded
fix-pm-hours-removal-production.sql           # ✅ KEEP - production ready
```

#### Slack User Mapping (3 files - keep only 1)
```
add-slack-user-mapping.sql                    # ❌ DELETE - superseded
add-slack-user-mapping-simple.sql             # ❌ DELETE - superseded
add-slack-user-mapping-complete.sql           # ✅ KEEP - most complete
bulk-update-slack-mappings.sql                # ❌ DELETE - one-time use
```

#### Google Drive (2 files - keep only 1)
```
fix-google-drive-rls.sql                      # ❌ DELETE - superseded
fix-google-drive-rls-complete.sql             # ✅ KEEP - complete version
cleanup-google-drive-policies.sql             # ❌ DELETE - one-time cleanup
```

#### RLS Policies (2 files - keep only 1)
```
fix-rls-policies.sql                          # ✅ KEEP - comprehensive
fix-rls-step-by-step.sql                      # ❌ DELETE - superseded
```

#### Other Redundant Files
```
check-redirect-uri.sql                        # ❌ DELETE - one-time check
complete-production-schema.sql                # ❌ DELETE - superseded by migrations
dashboard-fix-migration.sql                   # ❌ DELETE - one-time fix
```

### 3. Test Files and Directories (11+ items)
These are development/testing artifacts:

```
test.pdf                                      # ❌ DELETE - test file
src/app/dashboard/test-approval-link/         # ❌ DELETE - empty test directory
src/app/api/admin/gemini/test/                # ❌ DELETE - test API
src/app/api/admin/test-slack/                 # ❌ DELETE - test API
src/app/api/admin/salesforce/test/            # ❌ DELETE - test API
src/app/api/admin/slack/test/                 # ❌ DELETE - test API
src/app/api/admin/slack/test-bot-token/       # ❌ DELETE - test API
src/app/api/admin/avoma/test/                 # ❌ DELETE - test API
src/app/api/admin/email/test/                 # ❌ DELETE - test API
src/app/api/salesforce/test-connection/       # ❌ DELETE - test API
src/app/api/slack/test-lookup/                # ❌ DELETE - test API
src/app/api/avoma/test-parameters/            # ❌ DELETE - test API
```

### 4. Environment Files
```
.env.remote                                   # ❌ DELETE - temporary backup
```

## 📁 Files to Keep and Organize

### SQL Files to Keep (8 files)
```
add-ai-prompt-versions-table.sql              # ✅ KEEP - feature migration
add-api-logs-table.sql                        # ✅ KEEP - feature migration
add-approver-role.sql                         # ✅ KEEP - feature migration
add-avoma-recordings-table.sql                # ✅ KEEP - feature migration
add-content-templates.sql                     # ✅ KEEP - feature migration
add-email-system.sql                          # ✅ KEEP - feature migration
add-gemini-logs-table.sql                     # ✅ KEEP - feature migration
add-google-drive-config.sql                   # ✅ KEEP - feature migration
add-leandata-signatory-id-column.sql          # ✅ KEEP - feature migration
add-slack-config-table.sql                    # ✅ KEEP - feature migration
add-slack-user-mapping-complete.sql           # ✅ KEEP - most complete version
fix-ai-prompt-versions-uuid.sql               # ✅ KEEP - bug fix
fix-foreign-key-constraints.sql               # ✅ KEEP - production fix
fix-google-drive-rls-complete.sql             # ✅ KEEP - complete version
fix-pm-hours-removal-production.sql           # ✅ KEEP - production ready
fix-rls-policies.sql                          # ✅ KEEP - comprehensive
fix-user-role-constraint.sql                  # ✅ KEEP - bug fix
```

### Documentation Files to Keep (6 files)
```
README.md                                     # ✅ KEEP - main documentation
ROLE_PERMISSIONS.md                           # ✅ KEEP - important reference
AI_PROMPT_VERSIONING_README.md                # ✅ KEEP - feature documentation
GOOGLE_DRIVE_SETUP.md                         # ✅ KEEP - setup guide
MULTIPLE_AVOMA_RECORDINGS_README.md           # ✅ KEEP - feature documentation
SLACK_SETUP.md                                # ✅ KEEP - setup guide
```

## 🎯 Recommended Actions

### Phase 1: Delete Temporary Files (Safe)
1. Delete all temporary documentation files
2. Delete test.pdf
3. Delete .env.remote
4. Delete empty test directories

### Phase 2: Clean Up Redundant SQL Files (Review Required)
1. Delete redundant PM hours removal files
2. Delete redundant Slack mapping files
3. Delete redundant Google Drive files
4. Delete one-time use migration files

### Phase 3: Remove Test API Routes (Review Required)
1. Remove all test API routes
2. Clean up any references to test routes

### Phase 4: Organize Remaining Files
1. Move SQL files to a `migrations/` directory
2. Move documentation to a `docs/` directory
3. Update .gitignore to prevent future accumulation

## 📈 Impact

### Before Cleanup
- **32 SQL files** in root
- **13 Markdown files** in root
- **10+ test API routes**
- **Cluttered root directory**

### After Cleanup
- **18 SQL files** (organized)
- **6 Markdown files** (organized)
- **0 test API routes**
- **Clean, organized structure**

### Benefits
- ✅ **Cleaner repository**
- ✅ **Easier navigation**
- ✅ **Reduced confusion**
- ✅ **Better organization**
- ✅ **Faster builds** (fewer files to process)

## ⚠️ Considerations

1. **Backup**: Create a backup before deleting files
2. **Review**: Some files might be referenced in documentation
3. **Testing**: Ensure no functionality is broken after cleanup
4. **Git History**: Files will remain in git history if needed

## 🚀 Next Steps

1. **Create backup branch**: `git checkout -b cleanup-backup`
2. **Execute Phase 1**: Delete safe-to-delete files
3. **Review and execute Phase 2**: Clean up redundant SQL files
4. **Execute Phase 3**: Remove test API routes
5. **Execute Phase 4**: Organize remaining files
6. **Test thoroughly**: Ensure everything still works
7. **Commit changes**: With clear commit messages

This cleanup will significantly improve the codebase organization and maintainability.
