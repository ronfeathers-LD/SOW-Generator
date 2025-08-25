# AI Prompt Version Control System

## Overview
This system adds comprehensive version control to AI Prompts, allowing administrators to track all changes, view version history, and revert to previous versions when needed.

## Features

### 1. Automatic Versioning
- **Every edit creates a new version** - When an AI prompt is updated, the system automatically creates a version record of the previous state
- **Version numbering** - Each prompt maintains an incremental version number
- **Change tracking** - All versions include metadata about who made the change and when

### 2. Version History
- **Complete audit trail** - View all previous versions of any prompt
- **Change reasons** - Administrators can specify why changes were made
- **User attribution** - Track who made each change
- **Timestamps** - See exactly when each version was created

### 3. Revert Functionality
- **Rollback capability** - Revert any prompt to a previous version
- **Safe reversion** - Reverting creates a new version, preserving the current state
- **Change reason tracking** - Document why a revert was performed

### 4. Database Schema

#### New Table: `ai_prompt_versions`
```sql
CREATE TABLE ai_prompt_versions (
  id UUID PRIMARY KEY,
  prompt_id UUID REFERENCES ai_prompts(id),
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  change_reason TEXT,
  is_current BOOLEAN DEFAULT false
);
```

#### Modified Table: `ai_prompts`
- Added `current_version` field to track the latest version number

### 5. API Endpoints

#### Updated Endpoints
- **PUT `/api/admin/ai-prompts/[id]`** - Now creates version records before updating
- **POST `/api/admin/ai-prompts`** - Creates initial version record for new prompts

#### New Endpoints
- **GET `/api/admin/ai-prompts/[id]/versions`** - Fetch version history for a prompt
- **POST `/api/admin/ai-prompts/[id]/revert`** - Revert prompt to a previous version

### 6. Frontend Features

#### Version History Modal
- **Version list** - Shows all versions with metadata
- **Content preview** - View the content of each version
- **Revert buttons** - Revert to any previous version
- **Change reasons** - Display why each change was made

#### Enhanced Edit Form
- **Change reason field** - Document why changes are being made
- **Version display** - Show current version number
- **Version history button** - Quick access to version history

### 7. User Experience

#### For Administrators
1. **Edit prompts normally** - The versioning happens automatically
2. **Add change reasons** - Document why changes are made (optional but recommended)
3. **View version history** - Click "Version History" button on any prompt
4. **Revert when needed** - Click "Revert" on any previous version
5. **Track changes** - See who made what changes and when

#### Version History View
- **Current version indicator** - Clearly marked with green "Current" badge
- **Chronological order** - Newest versions at the top
- **User attribution** - See who made each change
- **Change reasons** - Understand why changes were made
- **Content comparison** - View the actual content of each version

### 8. Data Integrity

#### Safety Features
- **No data loss** - Every change is preserved in version history
- **Referential integrity** - Version records are properly linked to prompts
- **Cascade deletion** - If a prompt is deleted, all versions are also deleted
- **Transaction safety** - Version creation and prompt updates happen atomically

#### Performance Considerations
- **Indexed queries** - Database indexes on frequently queried fields
- **Efficient joins** - Optimized queries for version history
- **Pagination ready** - Version history can be paginated if needed

### 9. Migration

#### Running the Migration
1. Execute the SQL migration file: `add-ai-prompt-versions-table.sql`
2. The system will automatically start versioning new changes
3. Existing prompts will get version 1 when first edited

#### Backward Compatibility
- **Existing functionality unchanged** - All current features work exactly as before
- **Gradual adoption** - Versioning starts working immediately after migration
- **No breaking changes** - API responses remain compatible

### 10. Best Practices

#### Change Management
- **Always add change reasons** - Document why changes are being made
- **Review version history** - Check previous versions before making changes
- **Use revert sparingly** - Reverting creates new versions, so use thoughtfully

#### Version Naming
- **Descriptive change reasons** - Use clear, specific language
- **Business context** - Include relevant business reasons for changes
- **User impact** - Note if changes affect end-user experience

## Technical Implementation

### Database Operations
1. **Version creation** - Happens before any prompt update
2. **Version flagging** - Only one version per prompt is marked as current
3. **Transaction safety** - All operations are wrapped in database transactions

### Error Handling
- **Graceful degradation** - If versioning fails, the main operation continues
- **Logging** - All versioning errors are logged for debugging
- **User feedback** - Clear error messages for any issues

### Security
- **Admin-only access** - Version control features require admin privileges
- **RLS policies** - Row-level security on version tables
- **User attribution** - All changes are tracked to specific users

## Future Enhancements

### Potential Improvements
- **Version comparison** - Side-by-side diff view between versions
- **Bulk operations** - Revert multiple prompts at once
- **Version tagging** - Mark specific versions as important or stable
- **Export functionality** - Download version history as reports
- **Approval workflows** - Require approval for certain types of changes

### Integration Opportunities
- **Audit logging** - Integrate with broader audit systems
- **Notification system** - Alert stakeholders of important changes
- **Backup integration** - Automatic backup of version history
- **Analytics** - Track change frequency and patterns
